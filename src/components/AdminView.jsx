import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Bell, Volume2, VolumeX, Sparkles, Coffee, Clock, CheckCircle2,
  AlertTriangle, PhoneCall, Receipt, Smartphone, ExternalLink,
  ChevronRight, UtensilsCrossed, Layers, Printer, X
} from 'lucide-react';
import { TABLES, MENU_ITEMS, formatMoney } from '../data/menu';
import { realtimeService, SESSION_ID } from '../services/realtime';
import { soundManager } from '../utils/sound';

export default function AdminView({ onOpenCustomerPreview }) {
  const [orders, setOrders] = useState([]);
  const [requests, setRequests] = useState([]);
  const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'qr' | 'menu'
  const [orderFilter, setOrderFilter] = useState('all'); // 'all' | 'pending' | 'preparing' | 'served'
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedTableQR, setSelectedTableQR] = useState(null);
  const [printOrder, setPrintOrder] = useState(null);

  // Load initial data and subscribe to realtime events
  useEffect(() => {
    // 1. Tải dữ liệu ban đầu
    realtimeService.fetchInitialData().then(({ orders: initOrders, requests: initReqs }) => {
      if (initOrders && initOrders.length > 0) setOrders(initOrders);
      if (initReqs && initReqs.length > 0) setRequests(initReqs);
    });

    // 2. Lắng nghe đơn hàng mới
    const unsubOrder = realtimeService.onNewOrder((newOrder) => {
      soundManager.playOrderBell();
      setOrders(prev => {
        const exists = prev.find(o => o.id === newOrder.id);
        if (exists) return prev;
        return [newOrder, ...prev];
      });
    });

    // 3. Lắng nghe cập nhật trạng thái đơn hàng
    const unsubStatus = realtimeService.onStatusUpdate((update) => {
      setOrders(prev => prev.map(o => o.id === update.orderId ? { ...o, status: update.status } : o));
    });

    // 4. Lắng nghe yêu cầu gọi nhân viên / tính tiền
    const unsubReq = realtimeService.onServiceRequest((newReq) => {
      soundManager.playAlertBell();
      setRequests(prev => {
        const exists = prev.find(r => r.id === newReq.id);
        if (exists) return prev;
        return [newReq, ...prev];
      });
    });

    return () => {
      unsubOrder();
      unsubStatus();
      unsubReq();
    };
  }, []);

  const handleToggleSound = () => {
    const nextState = !soundEnabled;
    setSoundEnabled(nextState);
    soundManager.enabled = nextState;
    if (nextState) soundManager.playOrderBell();
  };

  const handleUpdateStatus = (orderId, newStatus) => {
    soundManager.playClick();
    realtimeService.updateOrderStatus(orderId, newStatus);
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
  };

  const handleResolveRequest = (reqId) => {
    soundManager.playClick();
    realtimeService.resolveServiceRequest(reqId);
    setRequests(prev => prev.filter(r => r.id !== reqId));
  };

  const getTableUrl = (tableId) => {
    const origin = window.location.origin;
    const pathname = window.location.pathname;
    return `${origin}${pathname}?table=${tableId}&room=${SESSION_ID}`;
  };

  // Thống kê nhanh
  const pendingOrdersCount = orders.filter(o => o.status === 'pending').length;
  const activeRequestsCount = requests.filter(r => r.status !== 'resolved').length;
  const totalRevenue = orders
    .filter(o => o.status !== 'cancelled')
    .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

  const filteredOrders = orders.filter(o => {
    if (orderFilter === 'all') return true;
    return o.status === orderFilter;
  });

  return (
    <div className="admin-container">
      {/* HEADER TOP BAR */}
      <header className="admin-header">
        <div className="admin-header-brand">
          <div className="brand-logo-badge">
            <Coffee className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <div className="brand-title-wrap">
              <h1 className="brand-title">SmartQR Order</h1>
              <span className="brand-badge-live">
                <span className="pulse-dot"></span> Realtime Live
              </span>
            </div>
            <p className="brand-sub">Hệ Thống Đặt Món & Phục Vụ Thông Minh Tại Bàn</p>
          </div>
        </div>

        <div className="admin-header-actions">
          {/* Nút bật/tắt chuông */}
          <button
            onClick={handleToggleSound}
            className={`btn-icon ${soundEnabled ? 'btn-sound-on' : 'btn-sound-off'}`}
            title={soundEnabled ? 'Âm thanh thông báo: BẬT' : 'Âm thanh thông báo: TẮT'}
          >
            {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            <span className="text-xs font-medium">{soundEnabled ? 'Chuông BẬT' : 'Chuông TẮT'}</span>
          </button>

          {/* Xem thử nhanh giao diện điện thoại trên máy tính */}
          <button
            onClick={() => onOpenCustomerPreview(1)}
            className="btn-primary-preview"
          >
            <Smartphone size={16} />
            <span>Mở giả lập điện thoại</span>
          </button>
        </div>
      </header>

      {/* QUICK STATS CARDS */}
      <section className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon-wrap stat-icon-amber">
            <Bell size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Đơn chờ pha chế</span>
            <span className="stat-val text-amber-500">{pendingOrdersCount}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrap stat-icon-rose">
            <PhoneCall size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Yêu cầu phục vụ</span>
            <span className="stat-val text-rose-500">{activeRequestsCount}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrap stat-icon-emerald">
            <Receipt size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Doanh thu tạm tính</span>
            <span className="stat-val text-emerald-600">{formatMoney(totalRevenue)}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrap stat-icon-indigo">
            <Layers size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Bàn sẵn sàng quét</span>
            <span className="stat-val text-indigo-600">5 Bàn QR</span>
          </div>
        </div>
      </section>

      {/* KHU VỰC THÔNG BÁO KHẨN CẤP (GỌI NHÂN VIÊN / TÍNH TIỀN) */}
      {requests.length > 0 && (
        <section className="urgent-banner-section">
          <div className="urgent-banner-header">
            <div className="flex items-center gap-2 text-rose-600 font-bold">
              <AlertTriangle className="animate-bounce" size={20} />
              <span>YÊU CẦU CẦN HỖ TRỢ NGAY ({requests.length})</span>
            </div>
          </div>
          <div className="urgent-cards-list">
            {requests.map((req) => (
              <div
                key={req.id}
                className={`urgent-card ${req.type === 'call_staff' ? 'urgent-card-call' : 'urgent-card-bill'}`}
              >
                <div className="urgent-card-content">
                  <div className="urgent-card-top">
                    <span className="urgent-table-badge">BÀN {req.table_number || req.tableNumber || '?'}</span>
                    <span className="urgent-time">
                      <Clock size={12} /> {new Date(req.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                  <div className="urgent-title">
                    {req.type === 'call_staff' ? '🛎️ Gọi nhân viên phục vụ' : '💵 Yêu cầu tính tiền'}
                  </div>
                  <div className="urgent-customer">
                    Khách: <strong>{req.customer_name || req.customerName || 'Khách tại bàn'}</strong>
                  </div>
                  {req.reason && (
                    <div className="urgent-reason">
                      Lý do: <em>"{req.reason}"</em>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleResolveRequest(req.id)}
                  className="btn-resolve-urgent"
                >
                  <CheckCircle2 size={16} />
                  <span>Đã xử lý xong</span>
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* NAVIGATION TABS */}
      <div className="admin-nav-tabs">
        <button
          onClick={() => setActiveTab('orders')}
          className={`nav-tab-btn ${activeTab === 'orders' ? 'nav-tab-active' : ''}`}
        >
          <Receipt size={18} />
          <span>Đơn Hàng Realtime</span>
          {orders.length > 0 && <span className="tab-counter">{orders.length}</span>}
        </button>

        <button
          onClick={() => setActiveTab('qr')}
          className={`nav-tab-btn ${activeTab === 'qr' ? 'nav-tab-active' : ''}`}
        >
          <Smartphone size={18} />
          <span>5 Mã QR Bàn Đặt Món</span>
          <span className="tab-badge-new">Dùng thử</span>
        </button>

        <button
          onClick={() => setActiveTab('menu')}
          className={`nav-tab-btn ${activeTab === 'menu' ? 'nav-tab-active' : ''}`}
        >
          <UtensilsCrossed size={18} />
          <span>Menu 10 Món Nước Mẫu</span>
        </button>
      </div>

      {/* MAIN CONTENT AREA */}
      <main className="admin-main-content">
        {/* TAB 1: DANH SÁCH ĐƠN HÀNG REALTIME */}
        {activeTab === 'orders' && (
          <div className="orders-view-wrap">
            {/* Filter buttons */}
            <div className="order-filters-bar">
              <div className="filter-group">
                <button
                  onClick={() => setOrderFilter('all')}
                  className={`filter-btn ${orderFilter === 'all' ? 'filter-active' : ''}`}
                >
                  Tất cả ({orders.length})
                </button>
                <button
                  onClick={() => setOrderFilter('pending')}
                  className={`filter-btn ${orderFilter === 'pending' ? 'filter-active' : ''}`}
                >
                  Chờ xác nhận ({orders.filter(o => o.status === 'pending').length})
                </button>
                <button
                  onClick={() => setOrderFilter('preparing')}
                  className={`filter-btn ${orderFilter === 'preparing' ? 'filter-active' : ''}`}
                >
                  Đang pha chế ({orders.filter(o => o.status === 'preparing').length})
                </button>
                <button
                  onClick={() => setOrderFilter('served')}
                  className={`filter-btn ${orderFilter === 'served' ? 'filter-active' : ''}`}
                >
                  Đã phục vụ ({orders.filter(o => o.status === 'served').length})
                </button>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="pulse-dot-sm"></span>
                <span>Tự động cập nhật thời gian thực</span>
              </div>
            </div>

            {filteredOrders.length === 0 ? (
              <div className="empty-orders-card">
                <div className="empty-illustration">
                  <Coffee size={48} className="text-amber-400 opacity-60" />
                </div>
                <h3 className="empty-title">Chưa có đơn hàng nào trong phiên này</h3>
                <p className="empty-desc">
                  Hãy dùng camera điện thoại quét 1 trong 5 mã QR ở tab <strong>"5 Mã QR Bàn Đặt Món"</strong> hoặc bấm nút mở tab thử nghiệm để trải nghiệm tốc độ bắn đơn Realtime cực nhạy!
                </p>
                <button
                  onClick={() => setActiveTab('qr')}
                  className="btn-primary mt-4"
                >
                  <Smartphone size={16} />
                  <span>Xem 5 mã QR bàn ngay</span>
                </button>
              </div>
            ) : (
              <div className="orders-grid">
                {filteredOrders.map((order) => {
                  const statusMap = {
                    pending: { label: 'Mới đặt', class: 'status-pending' },
                    preparing: { label: 'Đang pha chế', class: 'status-preparing' },
                    served: { label: 'Đã phục vụ', class: 'status-served' },
                    completed: { label: 'Hoàn tất', class: 'status-completed' },
                  };
                  const currentStatus = statusMap[order.status] || statusMap.pending;

                  return (
                    <div key={order.id} className={`order-card card-status-${order.status || 'pending'}`}>
                      {/* Card Header */}
                      <div className="order-card-header">
                        <div className="order-card-table-badge">
                          BÀN {order.table_number || order.tableNumber}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setPrintOrder(order)}
                            className="btn-print-order"
                            title="In phiếu quầy bar / tạm tính K80"
                          >
                            <Printer size={13} />
                            <span>In phiếu</span>
                          </button>
                          <span className={`status-badge ${currentStatus.class}`}>
                            {currentStatus.label}
                          </span>
                        </div>
                      </div>

                      {/* Customer & Time */}
                      <div className="order-card-meta">
                        <div className="meta-customer">
                          Khách: <strong>{order.customer_name || order.customerName || 'Khách đặt'}</strong>
                        </div>
                        <div className="meta-time">
                          <Clock size={12} />
                          {new Date(order.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>

                      {/* Items List */}
                      <div className="order-items-table">
                        {(order.items || []).map((item, idx) => (
                          <div key={idx} className="order-item-row">
                            <div className="item-name-qty">
                              <span className="item-qty-badge">{item.quantity}x</span>
                              <span className="item-title">{item.name}</span>
                            </div>
                            <span className="item-price">{formatMoney((item.price || 0) * (item.quantity || 1))}</span>
                            {item.note && (
                              <div className="item-note">Ghi chú: {item.note}</div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Ghi chú chung */}
                      {order.note && (
                        <div className="order-general-note">
                          <strong>Lưu ý:</strong> {order.note}
                        </div>
                      )}

                      {/* Total */}
                      <div className="order-card-total">
                        <span>Tổng tiền:</span>
                        <strong className="text-amber-600 font-bold text-lg">
                          {formatMoney(order.total_amount || order.totalAmount || 0)}
                        </strong>
                      </div>

                      {/* Status Action Buttons */}
                      <div className="order-card-actions">
                        {order.status === 'pending' && (
                          <button
                            onClick={() => handleUpdateStatus(order.id, 'preparing')}
                            className="btn-status-action btn-to-preparing"
                          >
                            <span>Tiếp nhận & Pha chế</span>
                            <ChevronRight size={14} />
                          </button>
                        )}

                        {order.status === 'preparing' && (
                          <button
                            onClick={() => handleUpdateStatus(order.id, 'served')}
                            className="btn-status-action btn-to-served"
                          >
                            <span>Đã pha xong, Giao món</span>
                            <ChevronRight size={14} />
                          </button>
                        )}

                        {order.status === 'served' && (
                          <button
                            onClick={() => handleUpdateStatus(order.id, 'completed')}
                            className="btn-status-action btn-to-completed"
                          >
                            <CheckCircle2 size={14} />
                            <span>Khách đã thanh toán xong</span>
                          </button>
                        )}

                        {order.status === 'completed' && (
                          <div className="text-center text-xs text-emerald-600 font-semibold py-1">
                            ✓ Đã hoàn tất thanh toán
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: 5 MÃ QR CODE CHO 5 BÀN */}
        {activeTab === 'qr' && (
          <div className="qr-tab-wrap">
            <div className="qr-intro-banner">
              <div className="qr-intro-text">
                <h3 className="font-bold text-lg text-slate-800">
                  Thử nghiệm thực tế: Dùng camera điện thoại quét 1 mã QR bất kỳ
                </h3>
                <p className="text-sm text-slate-600 mt-1">
                  Trang web sẽ tự nhận diện bạn đang ngồi bàn nào, yêu cầu nhập tên và hiển thị menu 10 món nước để bạn thoải mái chọn, tăng giảm số lượng, hoặc bấm gọi nhân viên / tính tiền!
                </p>
              </div>

            </div>

            <div className="qr-tables-grid">
              {TABLES.map((table) => {
                const tableUrl = getTableUrl(table.id);
                const tableOrdersCount = orders.filter(o => (o.table_number || o.tableNumber) === table.id && o.status !== 'completed').length;

                return (
                  <div key={table.id} className="table-qr-card">
                    <div className="table-card-header">
                      <div className="table-num-pill">{table.name}</div>
                      <span className="table-area-text">{table.area}</span>
                    </div>

                    <div className="qr-canvas-wrapper" onClick={() => setSelectedTableQR(table)}>
                      <QRCodeSVG
                        value={tableUrl}
                        size={170}
                        level="M"
                        includeMargin={true}
                        imageSettings={{
                          src: "https://cdn-icons-png.flaticon.com/512/924/924514.png",
                          x: undefined,
                          y: undefined,
                          height: 28,
                          width: 28,
                          excavate: true,
                        }}
                      />
                      <span className="qr-scan-hint">Bấm để phóng to</span>
                    </div>

                    <div className="table-card-status">
                      {tableOrdersCount > 0 ? (
                        <span className="table-active-dot">
                          <span className="pulse-dot"></span> Có {tableOrdersCount} đơn đang phục vụ
                        </span>
                      ) : (
                        <span className="table-free-dot">Bàn trống / Sẵn sàng</span>
                      )}
                    </div>

                    <div className="table-card-buttons">
                      <button
                        onClick={() => onOpenCustomerPreview(table.id)}
                        className="btn-table-preview"
                        title="Mở giả lập màn hình khách bàn này ngay trên máy tính"
                      >
                        <Smartphone size={14} />
                        <span>Mở test bàn này</span>
                      </button>

                      <a
                        href={tableUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-table-newtab"
                        title="Mở tab mới trong trình duyệt"
                      >
                        <ExternalLink size={14} />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: MENU 10 MÓN NƯỚC MẪU */}
        {activeTab === 'menu' && (
          <div className="menu-tab-wrap">
            <div className="menu-tab-header">
              <div>
                <h3 className="font-bold text-lg text-slate-800">Danh Mục 10 Món Nước Tuyển Chọn</h3>
                <p className="text-sm text-slate-500">Menu được thiết kế tối ưu với hình ảnh sắc nét, giá bán và phân loại hấp dẫn</p>
              </div>
            </div>

            <div className="admin-menu-grid">
              {MENU_ITEMS.map((item) => (
                <div key={item.id} className="admin-menu-card">
                  <div className="admin-menu-img-wrap">
                    <img src={item.image} alt={item.name} loading="lazy" />
                    <span className="admin-menu-tag">{item.tag}</span>
                  </div>
                  <div className="admin-menu-body">
                    <h4 className="admin-menu-name">{item.name}</h4>
                    <p className="admin-menu-desc">{item.description}</p>
                    <div className="admin-menu-price">{formatMoney(item.price)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* MODAL PHÓNG TO MÃ QR KHI BẤM VÀO */}
      {selectedTableQR && (
        <div className="modal-backdrop" onClick={() => setSelectedTableQR(null)}>
          <div className="modal-qr-zoom" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-slate-900 mb-1">{selectedTableQR.name}</h3>
            <p className="text-sm text-slate-500 mb-4">{selectedTableQR.area}</p>

            <div className="p-4 bg-white rounded-2xl shadow-inner border border-slate-200 inline-block">
              <QRCodeSVG
                value={getTableUrl(selectedTableQR.id)}
                size={260}
                level="H"
                includeMargin={true}
              />
            </div>

            <p className="text-xs text-slate-500 mt-4">
              Mở camera trên điện thoại và hướng vào mã này để đặt món
            </p>

            <button
              onClick={() => setSelectedTableQR(null)}
              className="btn-secondary mt-5 w-full"
            >
              Đóng lại
            </button>
          </div>
        </div>
      )}

      {/* MODAL IN PHIẾU BẾP / TẠM TÍNH K80 */}
      {printOrder && (
        <div className="modal-backdrop" onClick={() => setPrintOrder(null)}>
          <div className="modal-receipt-box" onClick={e => e.stopPropagation()}>
            <div className="receipt-paper">
              <div className="receipt-header">
                <h3 className="receipt-shop-name">SMART CAFE & TEA</h3>
                <p className="receipt-sub">PHIẾU CHẾ BIẾN / TẠM TÍNH</p>
                <div className="receipt-divider-dashed"></div>
                <div className="receipt-meta-grid">
                  <span>Bàn: <strong>BÀN 0{printOrder.table_number || printOrder.tableNumber}</strong></span>
                  <span>Mã: #{printOrder.id}</span>
                  <span>Khách: {printOrder.customer_name || printOrder.customerName}</span>
                  <span>Giờ: {new Date(printOrder.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="receipt-divider-dashed"></div>
              </div>

              <div className="receipt-items-list">
                {(printOrder.items || []).map((it, idx) => (
                  <div key={idx} className="receipt-item-line">
                    <div className="receipt-item-col-name">
                      <span className="receipt-item-qty">{it.quantity}x</span>
                      <span className="receipt-item-name">{it.name}</span>
                    </div>
                    <span className="receipt-item-price">{formatMoney(it.price * it.quantity)}</span>
                  </div>
                ))}
              </div>

              <div className="receipt-divider-dashed"></div>

              <div className="receipt-total-row">
                <span>TỔNG CỘNG:</span>
                <strong>{formatMoney(printOrder.total_amount || printOrder.totalAmount)}</strong>
              </div>

              {printOrder.note && (
                <div className="receipt-note-box">
                  <strong>Ghi chú bếp:</strong> {printOrder.note}
                </div>
              )}

              <div className="receipt-footer">
                <p>Cảm ơn quý khách & Hẹn gặp lại!</p>
                <p className="text-[10px] text-slate-400 mt-1">Hệ thống SmartQR Order</p>
              </div>
            </div>

            <div className="receipt-actions-bar">
              <button
                onClick={() => setPrintOrder(null)}
                className="btn-secondary flex-1"
              >
                Đóng
              </button>
              <button
                onClick={() => window.print()}
                className="btn-primary flex-1 flex items-center justify-center gap-1.5"
              >
                <Printer size={15} />
                <span>In ngay (Print)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
