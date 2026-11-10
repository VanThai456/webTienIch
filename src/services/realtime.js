import { createClient } from '@supabase/supabase-js';
import mqtt from 'mqtt';

// 1. Đọc cấu hình Supabase từ file .env bí mật (an toàn, không lộ trên UI)
const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export let supabase = null;
const isConfigured = envUrl && envKey && envUrl.startsWith('http') && !envUrl.includes('your-project');

if (isConfigured) {
  try {
    supabase = createClient(envUrl, envKey);
  } catch (err) {
    console.warn('Lỗi kết nối Supabase:', err);
  }
}

// 2. Định danh Session ID (Đồng bộ chuẩn xác giữa các Tab và thiết bị quét QR)
const urlParams = new URLSearchParams(window.location.search);
const existingRoom = urlParams.get('room');

const getSessionId = () => {
  if (existingRoom) {
    localStorage.setItem('smartqr_session_id', existingRoom);
    return existingRoom;
  }
  let stored = localStorage.getItem('smartqr_session_id');
  if (!stored) {
    stored = 'DEMO-' + Math.random().toString(36).substring(2, 7).toUpperCase();
    localStorage.setItem('smartqr_session_id', stored);
  }
  return stored;
};

export const SESSION_ID = getSessionId();

// 3. Kênh dự phòng BroadcastChannel (dành cho test cùng máy / 2 tab)
const broadcastChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('smartqr_' + SESSION_ID) : null;

// 4. Kênh dự phòng MQTT qua WebSocket (chạy độc lập, không cần Supabase vẫn Realtime 100% từ xa qua 4G/Wifi)
let mqttClient = null;
try {
  mqttClient = mqtt.connect('wss://broker.emqx.io:8084/mqtt', {
    clientId: 'smartqr_' + Math.random().toString(16).substring(2, 8),
    clean: true,
    connectTimeout: 5000,
    reconnectPeriod: 3000,
  });
} catch (e) {
  console.warn('Không thể kết nối MQTT:', e);
}

// Listeners đăng ký nhận sự kiện realtime
const orderListeners = new Set();
const requestListeners = new Set();
const statusListeners = new Set();

// Đăng ký MQTT topic cho session này
if (mqttClient) {
  mqttClient.on('connect', () => {
    mqttClient.subscribe(`smartqr/${SESSION_ID}/#`);
  });

  mqttClient.on('message', (topic, payload) => {
    try {
      const data = JSON.parse(payload.toString());
      if (topic.includes('/new_order')) {
        orderListeners.forEach(fn => fn(data));
      } else if (topic.includes('/service_request')) {
        requestListeners.forEach(fn => fn(data));
      } else if (topic.includes('/update_status')) {
        statusListeners.forEach(fn => fn(data));
      }
    } catch (e) {
      console.error('Lỗi parse MQTT message:', e);
    }
  });
}

// Lắng nghe BroadcastChannel
if (broadcastChannel) {
  broadcastChannel.onmessage = (event) => {
    const { type, payload } = event.data || {};
    if (type === 'NEW_ORDER') orderListeners.forEach(fn => fn(payload));
    if (type === 'SERVICE_REQUEST') requestListeners.forEach(fn => fn(payload));
    if (type === 'UPDATE_STATUS') statusListeners.forEach(fn => fn(payload));
  };
}

// Lắng nghe Supabase Realtime nếu đã kết nối
if (supabase) {
  supabase.channel(`smartqr_room_${SESSION_ID}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders', filter: `session_id=eq.${SESSION_ID}` }, (payload) => {
      orderListeners.forEach(fn => fn(payload.new));
    })
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `session_id=eq.${SESSION_ID}` }, (payload) => {
      statusListeners.forEach(fn => fn(payload.new));
    })
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'service_requests', filter: `session_id=eq.${SESSION_ID}` }, (payload) => {
      requestListeners.forEach(fn => fn(payload.new));
    })
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'service_requests', filter: `session_id=eq.${SESSION_ID}` }, (payload) => {
      requestListeners.forEach(fn => fn(payload.new));
    })
    .subscribe();
}

/**
 * Các hàm gửi dữ liệu
 */
export const realtimeService = {
  // Kiểm tra xem Supabase đã được kết nối chưa
  hasDatabase: () => !!supabase,

  // Gửi đơn hàng mới
  async sendOrder(orderData) {
    const orderWithMeta = {
      ...orderData,
      id: orderData.id || ('ORD-' + Date.now().toString().slice(-6)),
      session_id: SESSION_ID,
      created_at: new Date().toISOString(),
      status: 'pending',
    };

    // 1. Lưu Supabase nếu có
    if (supabase) {
      try {
        const { error } = await supabase.from('orders').insert([orderWithMeta]);
        if (error) {
          console.error('❌ Lỗi Supabase insert order:', error);
        } else {
          console.log('✅ Đã lưu đơn hàng vào Supabase:', orderWithMeta.id);
        }
      } catch (err) {
        console.warn('Supabase insert order error, using realtime fallback:', err);
      }
    } else {
      console.warn('⚠️ Supabase chưa được kết nối! Vui lòng kiểm tra file .env');
    }

    // 2. Bắn qua MQTT
    if (mqttClient && mqttClient.connected) {
      mqttClient.publish(`smartqr/${SESSION_ID}/new_order`, JSON.stringify(orderWithMeta));
    }

    // 3. Bắn qua BroadcastChannel
    if (broadcastChannel) {
      broadcastChannel.postMessage({ type: 'NEW_ORDER', payload: orderWithMeta });
    }

    // Tự kích hoạt listener nội bộ
    orderListeners.forEach(fn => fn(orderWithMeta));
    return orderWithMeta;
  },

  // Cập nhật trạng thái đơn (pending -> preparing -> served -> completed)
  async updateOrderStatus(orderId, status) {
    const updatePayload = { orderId, status, session_id: SESSION_ID, updated_at: new Date().toISOString() };

    if (supabase) {
      try {
        await supabase.from('orders').update({ status }).eq('id', orderId);
      } catch (err) {
        console.warn('Supabase update status error:', err);
      }
    }

    if (mqttClient && mqttClient.connected) {
      mqttClient.publish(`smartqr/${SESSION_ID}/update_status`, JSON.stringify(updatePayload));
    }

    if (broadcastChannel) {
      broadcastChannel.postMessage({ type: 'UPDATE_STATUS', payload: updatePayload });
    }

    statusListeners.forEach(fn => fn(updatePayload));
  },

  // Gửi yêu cầu gọi nhân viên hoặc gọi tính tiền
  async sendServiceRequest(requestData) {
    const requestWithMeta = {
      ...requestData,
      id: requestData.id || ('REQ-' + Date.now().toString().slice(-6)),
      session_id: SESSION_ID,
      created_at: new Date().toISOString(),
      status: 'pending',
    };

    if (supabase) {
      try {
        const { error } = await supabase.from('service_requests').insert([requestWithMeta]);
        if (error) {
          console.error('❌ Lỗi Supabase insert service_request:', error);
        } else {
          console.log('✅ Đã lưu yêu cầu vào Supabase:', requestWithMeta.id);
        }
      } catch (err) {
        console.warn('Supabase insert request error:', err);
      }
    }

    if (mqttClient && mqttClient.connected) {
      mqttClient.publish(`smartqr/${SESSION_ID}/service_request`, JSON.stringify(requestWithMeta));
    }

    if (broadcastChannel) {
      broadcastChannel.postMessage({ type: 'SERVICE_REQUEST', payload: requestWithMeta });
    }

    requestListeners.forEach(fn => fn(requestWithMeta));
    return requestWithMeta;
  },

  // Xử lý xong yêu cầu gọi nhân viên / tính tiền
  async resolveServiceRequest(requestId) {
    if (supabase) {
      try {
        await supabase.from('service_requests').update({ status: 'resolved' }).eq('id', requestId);
      } catch (err) {
        console.warn('Supabase resolve request error:', err);
      }
    }
  },

  // Đăng ký nhận đơn hàng mới
  onNewOrder(callback) {
    orderListeners.add(callback);
    return () => orderListeners.delete(callback);
  },

  // Đăng ký nhận yêu cầu dịch vụ (gọi nhân viên/tính tiền)
  onServiceRequest(callback) {
    requestListeners.add(callback);
    return () => requestListeners.delete(callback);
  },

  // Đăng ký nhận cập nhật trạng thái đơn
  onStatusUpdate(callback) {
    statusListeners.add(callback);
    return () => statusListeners.delete(callback);
  },

  // Lấy danh sách ban đầu từ Supabase (Lấy đơn của phiên hiện tại trong 24 giờ qua)
  async fetchInitialData() {
    if (!supabase) return { orders: [], requests: [] };
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: orders, error: oErr } = await supabase
        .from('orders')
        .select('*')
        .eq('session_id', SESSION_ID)
        .gte('created_at', oneDayAgo)
        .order('created_at', { ascending: false });

      if (oErr) console.error('❌ Lỗi tải orders từ Supabase:', oErr);

      const { data: requests, error: rErr } = await supabase
        .from('service_requests')
        .select('*')
        .eq('session_id', SESSION_ID)
        .gte('created_at', oneDayAgo)
        .order('created_at', { ascending: false });

      if (rErr) console.error('❌ Lỗi tải requests từ Supabase:', rErr);

      // Tự động dọn dẹp các đơn test cũ hơn 24 giờ trên Supabase ở chế độ nền
      this.cleanupOldDatabaseRecords();

      return { orders: orders || [], requests: requests || [] };
    } catch (e) {
      console.error('❌ Lỗi fetchInitialData:', e);
      return { orders: [], requests: [] };
    }
  },

  // Tải danh sách đơn đã gọi của một bàn cụ thể
  async fetchTableOrders(tableNumber) {
    if (!supabase) return [];
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('session_id', SESSION_ID)
        .eq('table_number', Number(tableNumber))
        .order('created_at', { ascending: false });
      if (error) console.error('❌ Lỗi tải đơn của bàn:', error);
      return data || [];
    } catch {
      return [];
    }
  },

  // Tự động xóa các bản ghi quá 24 giờ để database luôn sạch sẽ
  async cleanupOldDatabaseRecords() {
    if (!supabase) return;
    try {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      await supabase.from('orders').delete().lt('created_at', yesterday);
      await supabase.from('service_requests').delete().lt('created_at', yesterday);
    } catch {
      // Bỏ qua lỗi dọn dẹp ngầm
    }
  },

  // Xóa toàn bộ dữ liệu đơn hàng và yêu cầu của phiên hiện tại trên Supabase
  async clearSessionData() {
    if (supabase) {
      try {
        await supabase.from('orders').delete().eq('session_id', SESSION_ID);
        await supabase.from('service_requests').delete().eq('session_id', SESSION_ID);
      } catch (err) {
        console.warn('Lỗi xóa Supabase session data:', err);
      }
    }
  },

  // Tạo một phiên demo mới hoàn toàn (Mã phòng mới, bàn trống 100%)
  createNewSession() {
    const newSessionId = 'DEMO-' + Math.random().toString(36).substring(2, 7).toUpperCase();
    sessionStorage.setItem('smartqr_guest_id', newSessionId);
    const url = new URL(window.location.href);
    url.searchParams.set('room', newSessionId);
    url.searchParams.delete('table'); // đảm bảo về trang admin
    window.location.href = url.pathname + '?room=' + newSessionId;
  }
};
