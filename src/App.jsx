import React, { useState, useEffect } from 'react';
import AdminView from './components/AdminView';
import CustomerView from './components/CustomerView';
import { Smartphone, X, ExternalLink } from 'lucide-react';
import { SESSION_ID } from './services/realtime';

function App() {
  // Kiểm tra xem trang có đang mở ở chế độ khách hàng không (?table=X)
  const [urlParams, setUrlParams] = useState(() => new URLSearchParams(window.location.search));
  const isDirectCustomer = urlParams.has('table');
  const directTableId = urlParams.get('table') || '1';

  // Chế độ mô phỏng điện thoại ngay trên màn hình máy tính cho bản thuyết trình / demo
  const [previewPhoneTable, setPreviewPhoneTable] = useState(null);

  // Lắng nghe thay đổi URL nếu có
  useEffect(() => {
    const handlePopState = () => {
      setUrlParams(new URLSearchParams(window.location.search));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Nếu người dùng quét QR từ điện thoại hoặc mở trực tiếp đường dẫn ?table=X
  if (isDirectCustomer) {
    return <CustomerView tableId={directTableId} />;
  }

  // Mặc định: Màn hình Quản lý & Thu ngân POS Showcase
  return (
    <div className="app-root-shell">
      <AdminView
        onOpenCustomerPreview={(tableId) => setPreviewPhoneTable(tableId)}
      />

      {/* POPUP GIẢ LẬP ĐIỆN THOẠI (TRÊN MÁY TÍNH & MOBILE KHI CHỌN THỬ VAI KHÁCH) */}
      {previewPhoneTable && (
        <div className="phone-simulator-backdrop" onClick={() => setPreviewPhoneTable(null)}>
          <div className="phone-simulator-frame" onClick={e => e.stopPropagation()}>
            {/* Thanh trên cùng của khung điện thoại */}
            <div className="phone-notch-bar">
              <span className="phone-speaker"></span>
              <span className="phone-camera"></span>
            </div>

            <div className="phone-header-controls">
              <span className="phone-header-label">
                <Smartphone size={14} className="phone-header-icon" />
                Giả lập Khách — Bàn 0{previewPhoneTable}
              </span>
              <div className="phone-header-btns">
                <a
                  href={`${window.location.origin}${window.location.pathname}?table=${previewPhoneTable}&room=${SESSION_ID}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-icon-sm phone-newtab-link"
                  title="Mở giao diện khách (không có nút quay lại)"
                >
                  <ExternalLink size={14} />
                </a>
                <button
                  onClick={() => setPreviewPhoneTable(null)}
                  className="phone-close-pill"
                  title="Đóng giả lập và xem kết quả tại Quầy"
                >
                  <span>Đóng</span>
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Màn hình CustomerView nhúng bên trong khung điện thoại */}
            <div className="phone-screen-content">
              <CustomerView tableId={previewPhoneTable} />
            </div>

            {/* Thanh Home bar dưới đáy điện thoại */}
            <div className="phone-home-indicator"></div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
