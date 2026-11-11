import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Bell, Volume2, VolumeX, Coffee, Clock, CheckCircle2,
  AlertTriangle, PhoneCall, Receipt, Smartphone, ExternalLink,
  ChevronRight, UtensilsCrossed, Layers, Printer, X,
  MessageCircle, QrCode, Mail
} from 'lucide-react';
import {
  TABLES,
  MENU_ITEMS,
  SERVICE_INFO,
  createSampleOrder,
  formatMoney,
} from '../data/menu';
import { realtimeService, SESSION_ID } from '../services/realtime';
import { soundManager } from '../utils/sound';

export default function AdminView({ onOpenCustomerPreview }) {
  // Đọc danh sách đơn thật đã lưu trong bộ nhớ cache local để khi bấm F5 không bị mất đơn
  const [orders, setOrders] = useState(() => {
    try {
      const cached = localStorage.getItem('smartqr_orders_' + SESSION_ID);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const [requests, setRequests] = useState(() => {
    try {
      const cached = localStorage.getItem('smartqr_requests_' + SESSION_ID);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const [sampleOrder, setSampleOrder] = useState(() => createSampleOrder());
  const [sampleDismissed, setSampleDismissed] = useState(() => {
    try {
      return localStorage.getItem('smartqr_sample_dismissed_' + SESSION_ID) === '1';
    } catch {
      return false;
    }
  });

  const [activeTab, setActiveTab] = useState('workspace'); // 'workspace' | 'menu'
  const [orderFilter, setOrderFilter] = useState('all'); // 'all' | 'pending' | 'preparing' | 'served'
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedTableQR, setSelectedTableQR] = useState(null);
  const [printOrder, setPrintOrder] = useState(null);
  const [showConsultModal, setShowConsultModal] = useState(false);

  // Tự động lưu cache mỗi khi orders hoặc requests thay đổi
  useEffect(() => {
    try {
      localStorage.setItem('smartqr_orders_' + SESSION_ID, JSON.stringify(orders));
    } catch {
      // bỏ qua lỗi cache
    }
  }, [orders]);

  useEffect(() => {
    try {
      localStorage.setItem('smartqr_requests_' + SESSION_ID, JSON.stringify(requests));
    } catch {
      // bỏ qua lỗi cache
    }
  }, [requests]);

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
    // Đơn mẫu chỉ cập nhật cục bộ trên giao diện, không gửi lên Supabase
    if (orderId === sampleOrder.id) {
      setSampleOrder(prev => ({ ...prev, status: newStatus }));
      return;
    }
    realtimeService.updateOrderStatus(orderId, newStatus);
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
  };

  const handleDismissSample = () => {
    soundManager.playClick();
    setSampleDismissed(true);
    try {
      localStorage.setItem('smartqr_sample_dismissed_' + SESSION_ID, '1');
    } catch {
      // bỏ qua lỗi cache
    }
  };

  const handleRestoreSample = () => {
    soundManager.playClick();
    setSampleOrder(createSampleOrder());
    setSampleDismissed(false);
    try {
      localStorage.removeItem('smartqr_sample_dismissed_' + SESSION_ID);
    } catch {
      // bỏ qua lỗi cache
    }
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

  // Khi chưa có đơn thật nào và chưa ẩn đơn mẫu, hiển thị 1 đơn mẫu để người xem hình dung ngay
  const showingSampleOnly = orders.length === 0 && !sampleDismissed;
  const displayedOrders = showingSampleOnly ? [sampleOrder] : orders;

  // Thống kê nhanh
  const pendingOrdersCount = displayedOrders.filter(o => o.status === 'pending').length;
  const activeRequestsCount = requests.filter(r => r.status !== 'resolved').length;
  const totalRevenue = orders
    .filter(o => o.status !== 'cancelled')
    .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

  const filteredOrders = displayedOrders.filter(o => {
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
            <span className="btn-label-sm">{soundEnabled ? 'Chuông BẬT' : 'Chuông TẮT'}</span>
          </button>

          {/* CTA tư vấn triển khai */}
          <button
            onClick={() => setShowConsultModal(true)}
            className="btn-consult-cta"
          >
            <MessageCircle size={16} />
            <span>Nhận tư vấn</span>
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

      {/* SHOWCASE HERO BANNER: GIỚI THIỆU GIẢI PHÁP & HƯỚNG DẪN 3 BƯỚC */}
      <section className="showcase-hero-banner">
        <div className="showcase-hero-main">
          <h2 className="showcase-hero-title">{SERVICE_INFO.tagline}</h2>
          <p className="showcase-hero-desc">{SERVICE_INFO.description}</p>
          <div className="showcase-hero-actions">
            <button
              onClick={() => onOpenCustomerPreview(1)}
              className="btn-hero-try"
            >
              <Smartphone size={16} />
              <span>Thử vai Khách đặt món</span>
            </button>
            <button
              onClick={() => setShowConsultModal(true)}
              className="btn-hero-contact"
            >
              <MessageCircle size={16} />
              <span>Nhận tư vấn & Báo giá</span>
            </button>
          </div>
        </div>

        <div className="showcase-steps-col">
          {SERVICE_INFO.steps.map((s) => (
            <div key={s.step} className="showcase-step-item">
              <span className="showcase-step-num">{s.step}</span>
              <div>
                <div className="showcase-step-title">{s.title}</div>
                <div className="showcase-step-desc">{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* MOBILE CALLOUT: CHỈ HIỆN TRÊN MÀN HÌNH ĐIỆN THOẠI */}
      <section className="mobile-test-callout">
        <div className="mobile-callout-text">
          <strong>Bạn đang xem bằng điện thoại?</strong>
          <span>Không cần máy thứ 2 — bấm để đóng vai Khách ngồi Bàn 01 gọi món, rồi bấm Đóng để xem đơn nhảy về Quầy.</span>
        </div>
        <button
          onClick={() => onOpenCustomerPreview(1)}
          className="btn-mobile-try"
        >
          <Smartphone size={16} />
          <span>Thử vai Khách ngay</span>
        </button>
      </section>

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
            <span className="stat-label">
              Doanh thu đơn thật
            </span>
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

      {/* NAVIGATION TABS: GỘP TEST QR + ĐƠN REALTIME CHUNG MỘT KHÔNG GIAN */}
      <div className="admin-nav-tabs">
        <button
          onClick={() => setActiveTab('workspace')}
          className={`nav-tab-btn ${activeTab === 'workspace' ? 'nav-tab-active' : ''}`}
        >
          <QrCode size={18} />
          <span>Không Gian Test QR & Đơn Realtime</span>
          {displayedOrders.length > 0 && <span className="tab-counter">{displayedOrders.length}</span>}
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
        {/* TAB 1: KHÔNG GIAN TEST 5 MÃ QR & ĐƠN HÀNG REALTIME CÙNG LÚC */}
        {activeTab === 'workspace' && (
          <div className="workspace-split-grid">
            {/* CỘT TRÁI: 5 MÃ QR BÀN ĐẶT MÓN */}
            <section className="workspace-qr-panel">
              <div className="panel-section-head">
                <div>
                  <h3 className="panel-section-title">5 Mã QR Bàn Đặt Món</h3>
                  <p className="panel-section-sub">Quét bằng điện thoại hoặc bấm “Mở test” để gửi đơn thử</p>
                </div>
              </div>

              <div className="qr-tables-compact-grid">
                {TABLES.map((table) => {
                  const tableUrl = getTableUrl(table.id);
                  const tableOrdersCount = displayedOrders.filter(
                    o => (o.table_number || o.tableNumber) === table.id && o.status !== 'completed'
                  ).length;

                  return (
                    <div key={table.id} className="table-qr-card table-qr-card-compact">
                      <div className="table-card-header">
                        <div className="table-num-pill">{table.name}</div>
                        <span className="table-area-text">{table.area}</span>
                      </div>

                      <div className="qr-canvas-wrapper qr-canvas-compact" onClick={() => setSelectedTableQR(table)}>
                        <QRCodeSVG
                          value={tableUrl}
                          size={132}
                          level="M"
                          includeMargin={true}
                          imageSettings={{
                            src: "https://cdn-icons-png.flaticon.com/512/924/924514.png",
                            x: undefined,
                            y: undefined,
                            height: 24,
                            width: 24,
                            excavate: true,
                          }}
                        />
                        <span className="qr-scan-hint">Bấm phóng to</span>
                      </div>

                      <div className="table-card-status">
                        {tableOrdersCount > 0 ? (
                          <span className="table-active-dot">
                            <span className="pulse-dot"></span> {tableOrdersCount} đơn đang phục vụ
                          </span>
                        ) : (
                          <span className="table-free-dot">Bàn trống / Sẵn sàng</span>
                        )}
                      </div>

                      <div className="table-card-buttons">
                        <button
                          onClick={() => onOpenCustomerPreview(table.id)}
                          className="btn-table-preview"
                          title="Mở giả lập màn hình khách bàn này"
                        >
                          <Smartphone size={14} />
                          <span>Mở test bàn này</span>
                        </button>

                        <a
                          href={tableUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-table-newtab"
                          title="Mở giao diện khách ở tab mới"
                        >
                          <ExternalLink size={14} />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* CỘT PHẢI: DANH SÁCH ĐƠN HÀNG REALTIME */}
            <section className="workspace-orders-panel">
              <div className="panel-section-head">
                <div>
                  <h3 className="panel-section-title">
                    Đơn Hàng Realtime Tại Quầy
                    {showingSampleOnly && <span className="sample-header-pill">Đang hiện 1 đơn mẫu</span>}
                  </h3>
                  <p className="panel-section-sub">Đơn khách đặt từ mã QR hoặc giả lập sẽ tự động bật tại đây</p>
                </div>
                <div className="realtime-live-indicator">
                  <span className="pulse-dot-sm"></span>
                  <span>Tự động cập nhật</span>
                </div>
              </div>

              {/* Filter buttons */}
              <div className="order-filters-bar">
                <div className="filter-group">
                  <button
                    onClick={() => setOrderFilter('all')}
                    className={`filter-btn ${orderFilter === 'all' ? 'filter-active' : ''}`}
                  >
                    Tất cả ({displayedOrders.length})
                  </button>
                  <button
                    onClick={() => setOrderFilter('pending')}
                    className={`filter-btn ${orderFilter === 'pending' ? 'filter-active' : ''}`}
                  >
                    Chờ xác nhận ({displayedOrders.filter(o => o.status === 'pending').length})
                  </button>
                  <button
                    onClick={() => setOrderFilter('preparing')}
                    className={`filter-btn ${orderFilter === 'preparing' ? 'filter-active' : ''}`}
                  >
                    Đang pha chế ({displayedOrders.filter(o => o.status === 'preparing').length})
                  </button>
                  <button
                    onClick={() => setOrderFilter('served')}
                    className={`filter-btn ${orderFilter === 'served' ? 'filter-active' : ''}`}
                  >
                    Đã phục vụ ({displayedOrders.filter(o => o.status === 'served').length})
                  </button>
                </div>

                {orders.length === 0 && sampleDismissed && (
                  <button onClick={handleRestoreSample} className="btn-restore-sample">
                    Hiện lại đơn mẫu
                  </button>
                )}
              </div>

              {showingSampleOnly && (
                <div className="sample-info-strip">
                  <span>
                    Đây là <strong>đơn mẫu minh họa</strong> (không lưu database) để bạn thử thao tác duyệt đơn & In phiếu K80. Khi có đơn thật mới, mẫu sẽ tự ẩn.
                  </span>
                  <button onClick={handleDismissSample} className="btn-dismiss-sample" title="Ẩn đơn mẫu">
                    <X size={13} />
                    <span>Ẩn mẫu</span>
                  </button>
                </div>
              )}

              {filteredOrders.length === 0 ? (
                <div className="empty-orders-card">
                  <div className="empty-illustration">
                    <Coffee size={44} className="text-amber-400 opacity-60" />
                  </div>
                  <h3 className="empty-title">Chưa có đơn hàng nào ở trạng thái này</h3>
                  <p className="empty-desc">
                    Hãy bấm <strong>“Mở test bàn này”</strong> ở cột mã QR bên cạnh (hoặc quét QR bằng điện thoại) để tạo đơn hàng mới!
                  </p>
                  <button
                    onClick={() => onOpenCustomerPreview(1)}
                    className="btn-primary mt-4"
                  >
                    <Smartphone size={16} />
                    <span>Mở giả lập Bàn 01 ngay</span>
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
                      <div key={order.id} className={`order-card card-status-${order.status || 'pending'} ${order.isSample ? 'order-card-sample' : ''}`}>
                        {/* Card Header */}
                        <div className="order-card-header">
                          <div className="order-card-badges-left">
                            <div className="order-card-table-badge">
                              BÀN {order.table_number || order.tableNumber}
                            </div>
                            {order.isSample && (
                              <span className="sample-order-badge">ĐƠN MẪU</span>
                            )}
                          </div>
                          <div className="order-card-header-right">
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
                          <strong className="order-total-val">
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
                            <div className="order-completed-note">
                              ✓ Đã hoàn tất thanh toán
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}

        {/* TAB 2: MENU 10 MÓN NƯỚC MẪU */}
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

      {/* MODAL TƯ VẤN & LIÊN HỆ TRIỂN KHAI CHO QUÁN */}
      {showConsultModal && (
        <div className="modal-backdrop" onClick={() => setShowConsultModal(false)}>
          <div className="consult-modal-card" onClick={e => e.stopPropagation()}>
            <div className="consult-modal-header">
              <div>
                <span className="consult-badge">Triển khai trọn gói cho quán</span>
                <h3 className="consult-modal-title">{SERVICE_INFO.contact.ownerTitle}</h3>
              </div>
              <button
                onClick={() => setShowConsultModal(false)}
                className="consult-close-btn"
                title="Đóng"
              >
                <X size={18} />
              </button>
            </div>

            <div className="consult-highlights-box">
              <div className="consult-highlights-heading">Điểm nổi bật của giải pháp:</div>
              <ul className="consult-highlights-list">
                {SERVICE_INFO.highlights.map((item, idx) => (
                  <li key={idx}>
                    <CheckCircle2 size={15} className="consult-check-icon" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="consult-channels-list">
              {SERVICE_INFO.contact.hotlineTel ? (
                <a href={`tel:${SERVICE_INFO.contact.hotlineTel}`} className="consult-channel-card consult-channel-link">
                  <div className="consult-channel-icon consult-icon-amber">
                    <PhoneCall size={18} />
                  </div>
                  <div>
                    <div className="consult-channel-label">Hotline / Điện thoại trực tiếp</div>
                    <div className="consult-channel-val">{SERVICE_INFO.contact.hotlineDisplay}</div>
                  </div>
                </a>
              ) : (
                <div className="consult-channel-card">
                  <div className="consult-channel-icon consult-icon-amber">
                    <PhoneCall size={18} />
                  </div>
                  <div>
                    <div className="consult-channel-label">Hotline / Điện thoại trực tiếp</div>
                    <div className="consult-channel-val">{SERVICE_INFO.contact.hotlineDisplay}</div>
                  </div>
                </div>
              )}

              {SERVICE_INFO.contact.zaloUrl ? (
                <a
                  href={SERVICE_INFO.contact.zaloUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="consult-channel-card consult-channel-link"
                >
                  <div className="consult-channel-icon consult-icon-blue">
                    <MessageCircle size={18} />
                  </div>
                  <div>
                    <div className="consult-channel-label">Zalo tư vấn & Gửi bảng giá</div>
                    <div className="consult-channel-val">{SERVICE_INFO.contact.zaloLabel}</div>
                  </div>
                </a>
              ) : (
                <div className="consult-channel-card">
                  <div className="consult-channel-icon consult-icon-blue">
                    <MessageCircle size={18} />
                  </div>
                  <div>
                    <div className="consult-channel-label">Zalo tư vấn & Gửi bảng giá</div>
                    <div className="consult-channel-val">{SERVICE_INFO.contact.zaloLabel}</div>
                  </div>
                </div>
              )}

              <a
                href={`mailto:${SERVICE_INFO.contact.emailDisplay}`}
                className="consult-channel-card consult-channel-link"
              >
                <div className="consult-channel-icon consult-icon-emerald">
                  <Mail size={18} />
                </div>
                <div>
                  <div className="consult-channel-label">Email hỗ trợ</div>
                  <div className="consult-channel-val">{SERVICE_INFO.contact.emailDisplay}</div>
                </div>
              </a>
            </div>

            <button
              onClick={() => setShowConsultModal(false)}
              className="consult-done-btn"
            >
              Đóng cửa sổ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
