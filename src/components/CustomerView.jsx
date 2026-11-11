import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Coffee, ShoppingBag, Plus, Minus, Trash2, Bell, Receipt,
  Search, CheckCircle, ArrowRight, Sparkles, AlertCircle,
  Clock, X, Send, User, ChevronUp
} from 'lucide-react';
import { MENU_CATEGORIES, MENU_ITEMS, TABLES, formatMoney } from '../data/menu';
import { realtimeService, SESSION_ID } from '../services/realtime';
import { soundManager } from '../utils/sound';

export default function CustomerView({ tableId = 1 }) {
  // Tìm thông tin bàn
  const table = TABLES.find(t => t.id === Number(tableId)) || TABLES[0];

  // State thông tin khách
  const [customerName, setCustomerName] = useState(() => localStorage.getItem('smartqr_customer_name') || '');
  const [nameInput, setNameInput] = useState('');
  const [showNameModal, setShowNameModal] = useState(!localStorage.getItem('smartqr_customer_name'));

  // State giỏ hàng & menu
  const [cart, setCart] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [orderNote, setOrderNote] = useState('');
  const [showCartDrawer, setShowCartDrawer] = useState(false);

  // State tương tác & Modal
  const [showCallStaffModal, setShowCallStaffModal] = useState(false);
  const [showRequestBillModal, setShowRequestBillModal] = useState(false);
  const [staffReason, setStaffReason] = useState('Xin thêm đá');
  const [customReason, setCustomReason] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Chuyển khoản');
  const [feedbackMessage, setFeedbackMessage] = useState(null);

  // State đơn hàng đã đặt của bàn này (Khởi tạo từ bộ nhớ để F5 không bao giờ mất)
  const [myOrders, setMyOrders] = useState(() => {
    try {
      const cached = localStorage.getItem(`smartqr_myorders_${SESSION_ID}_${table.id}`);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [activeTab, setActiveTab] = useState('menu'); // 'menu' | 'history'

  // Tải lại các đơn của bàn từ Supabase khi mở
  useEffect(() => {
    realtimeService.fetchTableOrders(table.id).then(tableOrders => {
      if (tableOrders && tableOrders.length > 0) {
        setMyOrders(tableOrders);
      }
    });
  }, [table.id]);

  // Tự động lưu cache mỗi khi myOrders thay đổi
  useEffect(() => {
    try {
      localStorage.setItem(`smartqr_myorders_${SESSION_ID}_${table.id}`, JSON.stringify(myOrders));
    } catch {
      // bỏ qua lỗi cache
    }
  }, [myOrders, table.id]);

  // Lắng nghe cập nhật trạng thái đơn hàng của mình từ Admin
  useEffect(() => {
    const unsubStatus = realtimeService.onStatusUpdate((update) => {
      setMyOrders(prev => prev.map(o => o.id === update.orderId ? { ...o, status: update.status } : o));
    });
    return () => unsubStatus();
  }, []);

  const handleSaveName = (e) => {
    e.preventDefault();
    if (!nameInput.trim()) return;
    const cleanName = nameInput.trim();
    setCustomerName(cleanName);
    localStorage.setItem('smartqr_customer_name', cleanName);
    setShowNameModal(false);
    soundManager.playClick();
  };

  // Thêm món vào giỏ
  const handleAddToCart = (item) => {
    soundManager.playClick();
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1, note: '' }];
    });
  };

  // Tăng giảm số lượng
  const handleUpdateQty = (itemId, delta) => {
    soundManager.playClick();
    setCart(prev => {
      return prev.map(i => {
        if (i.id === itemId) {
          const nextQty = i.quantity + delta;
          return nextQty > 0 ? { ...i, quantity: nextQty } : null;
        }
        return i;
      }).filter(Boolean);
    });
  };

  // Xóa món khỏi giỏ
  const handleRemoveItem = (itemId) => {
    soundManager.playClick();
    setCart(prev => prev.filter(i => i.id !== itemId));
  };

  // Tính tổng tiền giỏ hàng
  const totalCartCount = cart.reduce((sum, i) => sum + i.quantity, 0);
  const totalCartAmount = cart.reduce((sum, i) => sum + (i.price * i.quantity), 0);

  // Gửi đơn đặt món
  const handleConfirmOrder = async () => {
    if (cart.length === 0) return;
    if (!customerName) {
      setShowNameModal(true);
      return;
    }

    soundManager.playClick();

    const orderPayload = {
      table_number: table.id,
      customer_name: customerName,
      items: cart.map(i => ({
        id: i.id,
        name: i.name,
        price: i.price,
        quantity: i.quantity,
        note: i.note || '',
      })),
      total_amount: totalCartAmount,
      note: orderNote.trim(),
    };

    const sentOrder = await realtimeService.sendOrder(orderPayload);
    setMyOrders(prev => [sentOrder, ...prev]);
    setCart([]);
    setOrderNote('');
    setShowCartDrawer(false);
    setActiveTab('history');

    // Hiệu ứng pháo hoa chúc mừng đặt món thành công
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 }
    });

    setFeedbackMessage('Đã gửi đơn thành công! Bếp đang chuẩn bị món cho bạn nhé.');
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  // Gửi yêu cầu gọi nhân viên
  const handleSendCallStaff = async () => {
    soundManager.playClick();
    const finalReason = staffReason === 'Khác' ? customReason.trim() : staffReason;
    await realtimeService.sendServiceRequest({
      table_number: table.id,
      customer_name: customerName || 'Khách tại bàn',
      type: 'call_staff',
      reason: finalReason || 'Cần hỗ trợ',
    });

    setShowCallStaffModal(false);
    setFeedbackMessage('Đã thông báo cho nhân viên! Nhân viên sẽ tới bàn bạn ngay.');
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  // Gửi yêu cầu tính tiền
  const handleSendRequestBill = async () => {
    soundManager.playClick();
    await realtimeService.sendServiceRequest({
      table_number: table.id,
      customer_name: customerName || 'Khách tại bàn',
      type: 'request_bill',
      reason: `Hình thức: ${paymentMethod}`,
    });

    setShowRequestBillModal(false);
    setFeedbackMessage('Đã gửi yêu cầu thanh toán! Nhân viên đang chuẩn bị hóa đơn.');
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  // Lọc món theo search & danh mục
  const filteredItems = MENU_ITEMS.filter(item => {
    const matchCat = selectedCategory === 'all' || item.category === selectedCategory;
    const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="customer-app-wrapper">
      <div className="customer-container">
        {/* TOP BAR / HEADER */}
        <header className="customer-header">
          <div className="customer-header-title">
            <div className="customer-table-tag">
              <span className="customer-table-pill">{table.name}</span>
              <span className="customer-area-text">{table.area}</span>
            </div>
            <div className="customer-greeting">
              Chào, <strong>{customerName || 'Quý khách'}</strong>
              <button
                onClick={() => setShowNameModal(true)}
                className="btn-edit-name"
                title="Đổi tên"
              >
                (Đổi)
              </button>
            </div>
          </div>

          {/* Tab Menu vs Lịch sử đơn */}
          <div className="customer-top-actions">
            <button
              onClick={() => setActiveTab(activeTab === 'menu' ? 'history' : 'menu')}
              className={`customer-tab-switch ${activeTab === 'history' ? 'active-history' : ''}`}
            >
              <Clock size={16} />
              <span>{activeTab === 'menu' ? 'Đơn đã đặt' : 'Xem menu'}</span>
              {myOrders.length > 0 && <span className="badge-dot"></span>}
            </button>
          </div>
        </header>

        {/* THÔNG BÁO PHẢN HỒI FLASH TOAST */}
        {feedbackMessage && (
          <div className="customer-toast">
            <span>{feedbackMessage}</span>
          </div>
        )}

        {/* NỘI DUNG CHÍNH (CUỘN TRONG KHUNG GIỮA) */}
        <div className="customer-body-scroll">
          {activeTab === 'menu' ? (
            <>
              {/* SEARCH BAR */}
              <div className="customer-search-wrap">
                <div className="customer-search-box">
                  <Search size={18} className="text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Tìm món nước yêu thích..."
                    className="customer-search-input"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600">
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>

              {/* CATEGORIES HORIZONTAL SCROLL */}
              <div className="customer-categories-scroll">
                {MENU_CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`category-pill ${selectedCategory === cat.id ? 'category-pill-active' : ''}`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>

              {/* MENU ITEMS LIST */}
              <div className="customer-menu-list">
                {filteredItems.map(item => {
                  const cartItem = cart.find(i => i.id === item.id);
                  const quantityInCart = cartItem ? cartItem.quantity : 0;

                  return (
                    <div key={item.id} className="customer-item-card">
                      <div className="customer-item-img-wrap">
                        <img src={item.image} alt={item.name} loading="lazy" />
                        {item.tag && <span className="customer-item-tag">{item.tag}</span>}
                      </div>

                      <div className="customer-item-info">
                        <h4 className="customer-item-name">{item.name}</h4>
                        <p className="customer-item-desc">{item.description}</p>

                        <div className="customer-item-bottom">
                          <span className="customer-item-price">{formatMoney(item.price)}</span>

                          {quantityInCart > 0 ? (
                            <div className="qty-control-inline">
                              <button onClick={() => handleUpdateQty(item.id, -1)} className="btn-qty-minus">
                                <Minus size={14} />
                              </button>
                              <span className="qty-number">{quantityInCart}</span>
                              <button onClick={() => handleUpdateQty(item.id, 1)} className="btn-qty-plus">
                                <Plus size={14} />
                              </button>
                            </div>
                          ) : (
                            <button onClick={() => handleAddToCart(item)} className="btn-add-item">
                              <Plus size={16} />
                              <span>Thêm</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            /* TAB LỊCH SỬ ĐƠN HÀNG ĐÃ ĐẶT TẠI BÀN */
            <div className="customer-history-wrap">
              <h3 className="history-title">Đơn hàng của bàn bạn ({table.name})</h3>
              {myOrders.length === 0 ? (
                <div className="history-empty">
                  <Coffee size={40} className="text-amber-400 opacity-60 mb-2" />
                  <p>Bạn chưa đặt món nào. Hãy chọn món nước từ menu nhé!</p>
                  <button onClick={() => setActiveTab('menu')} className="btn-primary-sm mt-3">
                    Chọn món ngay
                  </button>
                </div>
              ) : (
                <div className="history-list">
                  {myOrders.map(order => {
                    const statusMap = {
                      pending: { label: 'Bếp đã nhận đơn', color: 'text-amber-600 bg-amber-50' },
                      preparing: { label: 'Đang pha chế ', color: 'text-indigo-600 bg-indigo-50' },
                      served: { label: 'Đã giao món tới bàn ', color: 'text-emerald-600 bg-emerald-50' },
                      completed: { label: 'Đã thanh toán', color: 'text-slate-600 bg-slate-100' },
                    };
                    const st = statusMap[order.status] || statusMap.pending;

                    return (
                      <div key={order.id} className="history-card">
                        <div className="history-card-header">
                          <span className="history-order-id">Mã đơn: {order.id}</span>
                          <span className={`history-status-pill ${st.color}`}>
                            {st.label}
                          </span>
                        </div>

                        <div className="history-items">
                          {(order.items || []).map((it, idx) => (
                            <div key={idx} className="history-item-row">
                              <span>{it.quantity}x {it.name}</span>
                              <span>{formatMoney(it.price * it.quantity)}</span>
                            </div>
                          ))}
                        </div>

                        <div className="history-card-footer">
                          <span>Tổng cộng:</span>
                          <strong className="text-amber-600">{formatMoney(order.total_amount)}</strong>
                        </div>
                      </div>
                    );
                  })}

                  <button onClick={() => setActiveTab('menu')} className="btn-secondary w-full mt-4">
                    + Gọi thêm món nước khác
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* BOTTOM FIXED BAR (GỌI PHỤC VỤ, TÍNH TIỀN & GIỎ HÀNG) */}
        <div className="customer-bottom-bar">
          <div className="customer-actions-grid">
            {/* Nút Gọi nhân viên */}
            <button
              onClick={() => setShowCallStaffModal(true)}
              className="btn-bottom-action btn-call-staff"
            >
              <Bell size={18} />
              <span>Gọi nhân viên</span>
            </button>

            {/* Nút Gọi tính tiền */}
            <button
              onClick={() => setShowRequestBillModal(true)}
              className="btn-bottom-action btn-request-bill"
            >
              <Receipt size={18} />
              <span>Gọi tính tiền</span>
            </button>

            {/* Nút Giỏ hàng / Đặt món */}
            <button
              onClick={() => setShowCartDrawer(true)}
              className={`btn-bottom-action btn-cart ${cart.length > 0 ? 'btn-cart-has-items' : ''}`}
            >
              <div className="cart-btn-inner">
                <ShoppingBag size={18} />
                {totalCartCount > 0 && <span className="cart-badge">{totalCartCount}</span>}
              </div>
              <div className="cart-btn-text">
                <span className="cart-btn-title">Giỏ hàng</span>
                <span className="cart-btn-price">{formatMoney(totalCartAmount)}</span>
              </div>
            </button>
          </div>
        </div>

        {/* MODAL NHẬP TÊN KHÁCH HÀNG */}
        {showNameModal && (
          <div className="customer-modal-backdrop">
            <div className="customer-modal-box">
              <div className="name-modal-icon">
                <Coffee size={32} className="text-amber-500" />
              </div>
              <h3 className="name-modal-title">Chào mừng bạn đến với Quán!</h3>
              <p className="name-modal-desc">
                Bạn đang ngồi tại <strong>{table.name}</strong> ({table.area}). Vui lòng cho quán biết tên bạn để tiện xưng hô và phục vụ món nhé:
              </p>

              <form onSubmit={handleSaveName} className="mt-4">
                <input
                  type="text"
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  placeholder="Ví dụ: Anh Nam, Chị Linh..."
                  autoFocus
                  required
                  className="customer-input-field"
                />

                <button type="submit" className="btn-primary w-full mt-3">
                  <span>Bắt đầu gọi món</span>
                  <ArrowRight size={16} />
                </button>
              </form>
            </div>
          </div>
        )}

        {/* MODAL GỌI NHÂN VIÊN */}
        {showCallStaffModal && (
          <div className="customer-modal-backdrop" onClick={() => setShowCallStaffModal(false)}>
            <div className="customer-modal-box" onClick={e => e.stopPropagation()}>
              <div className="customer-modal-header">
                <h3 className="customer-modal-title">
                  <Bell className="customer-modal-icon-amber" size={19} />
                  <span>Gọi nhân viên phục vụ</span>
                </h3>
                <button
                  onClick={() => setShowCallStaffModal(false)}
                  className="customer-modal-close"
                  title="Đóng"
                >
                  <X size={18} />
                </button>
              </div>

              <p className="customer-modal-desc">
                Bàn <strong>{table.name}</strong> cần nhân viên hỗ trợ vấn đề gì:
              </p>

              <div className="quick-reasons-grid">
                {['Xin thêm đá', 'Lấy thêm khăn ướt', 'Chén / Dĩa / Muỗng', 'Tư vấn món', 'Khác'].map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setStaffReason(r)}
                    className={`reason-chip ${staffReason === r ? 'reason-chip-active' : ''}`}
                  >
                    {r}
                  </button>
                ))}
              </div>

              {staffReason === 'Khác' && (
                <input
                  type="text"
                  value={customReason}
                  onChange={e => setCustomReason(e.target.value)}
                  placeholder="Nhập nội dung cần hỗ trợ..."
                  className="customer-input-field customer-modal-input"
                />
              )}

              <button
                onClick={handleSendCallStaff}
                className="btn-primary customer-modal-submit"
              >
                <Send size={16} />
                <span>Gửi yêu cầu tới nhân viên</span>
              </button>
            </div>
          </div>
        )}

        {/* MODAL GỌI TÍNH TIỀN */}
        {showRequestBillModal && (
          <div className="customer-modal-backdrop" onClick={() => setShowRequestBillModal(false)}>
            <div className="customer-modal-box" onClick={e => e.stopPropagation()}>
              <div className="customer-modal-header">
                <h3 className="customer-modal-title">
                  <Receipt className="customer-modal-icon-emerald" size={19} />
                  <span>Yêu cầu thanh toán</span>
                </h3>
                <button
                  onClick={() => setShowRequestBillModal(false)}
                  className="customer-modal-close"
                  title="Đóng"
                >
                  <X size={18} />
                </button>
              </div>

              <p className="customer-modal-desc">
                Bàn <strong>{table.name}</strong> muốn thanh toán bằng hình thức nào:
              </p>

              <div className="quick-reasons-grid">
                {['Chuyển khoản', 'Tiền mặt'].map(opt => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setPaymentMethod(opt)}
                    className={`reason-chip ${paymentMethod === opt ? 'reason-chip-active' : ''}`}
                  >
                    {opt}
                  </button>
                ))}
              </div>

              <button
                onClick={handleSendRequestBill}
                className="btn-primary customer-modal-submit"
              >
                <Send size={16} />
                <span>Gửi yêu cầu thanh toán</span>
              </button>
            </div>
          </div>
        )}

        {/* CART DRAWER / BOTTOM SHEET */}
        {showCartDrawer && (
          <div className="cart-backdrop" onClick={() => setShowCartDrawer(false)}>
            <div className="cart-sheet" onClick={e => e.stopPropagation()}>
              <div className="cart-sheet-header">
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">Giỏ hàng của bạn</h3>
                  <span className="text-xs text-slate-500">{table.name} - {customerName}</span>
                </div>
                <button onClick={() => setShowCartDrawer(false)} className="text-slate-400 p-1">
                  <X size={20} />
                </button>
              </div>

              {cart.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-sm">
                  Giỏ hàng đang trống. Hãy chọn món nước từ menu nhé!
                </div>
              ) : (
                <>
                  <div className="cart-sheet-items">
                    {cart.map(item => (
                      <div key={item.id} className="cart-sheet-item-row">
                        <div className="cart-item-detail">
                          <h5 className="font-semibold text-slate-800 text-sm">{item.name}</h5>
                          <span className="text-xs text-amber-600 font-bold">{formatMoney(item.price)}</span>
                        </div>

                        <div className="cart-item-actions">
                          <button onClick={() => handleUpdateQty(item.id, -1)} className="btn-cart-qty">
                            <Minus size={12} />
                          </button>
                          <span className="cart-qty-val">{item.quantity}</span>
                          <button onClick={() => handleUpdateQty(item.id, 1)} className="btn-cart-qty">
                            <Plus size={12} />
                          </button>
                          <button onClick={() => handleRemoveItem(item.id)} className="btn-cart-del" title="Xóa món">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="cart-note-wrap">
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Ghi chú cho bếp (tùy chọn):</label>
                    <input
                      type="text"
                      value={orderNote}
                      onChange={e => setOrderNote(e.target.value)}
                      placeholder="Ví dụ: Ít ngọt, nhiều đá, tách đá riêng..."
                      className="customer-input-field text-xs"
                    />
                  </div>

                  <div className="cart-summary-box">
                    <div className="flex justify-between items-center text-sm mb-2">
                      <span className="text-slate-600">Số lượng:</span>
                      <strong className="text-slate-800">{totalCartCount} món</strong>
                    </div>
                    <div className="flex justify-between items-center text-base border-t border-slate-200 pt-2">
                      <span className="font-semibold text-slate-800">Tổng thanh toán:</span>
                      <strong className="text-xl text-amber-600 font-extrabold">{formatMoney(totalCartAmount)}</strong>
                    </div>
                  </div>

                  <button
                    onClick={handleConfirmOrder}
                    className="btn-confirm-order"
                  >
                    <span>Xác nhận Đặt Món Ngay</span>
                    <ArrowRight size={18} />
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

