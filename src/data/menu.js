// Danh sách 10 món nước chất lượng cao phục vụ demo SmartQR
export const MENU_CATEGORIES = [
  { id: 'all', name: 'Tất cả' },
  { id: 'coffee', name: 'Cà Phê' },
  { id: 'tea', name: 'Trà Trái Cây' },
  { id: 'milktea_smoothie', name: 'Trà Sữa & Đá Xay' },
];

export const MENU_ITEMS = [
  {
    id: 'drink-01',
    name: 'Cà Phê Muối Đặc Biệt',
    category: 'coffee',
    price: 29000,
    tag: 'Bán chạy',
    image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80',
    description: 'Hương vị cà phê Robusta Đắk Lắk đậm đà kết hợp lớp kem muối béo mặn mượt mà khó cưỡng.',
  },
  {
    id: 'drink-02',
    name: 'Bạc Xỉu Sữa Tươi Sương Sáo',
    category: 'coffee',
    price: 32000,
    tag: 'Món quen',
    image: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?auto=format&fit=crop&w=600&q=80',
    description: 'Vị ngọt dịu từ sữa đặc, thơm béo của sữa tươi hòa cùng thạch sương sáo thanh mát giòn dai.',
  },
  {
    id: 'drink-03',
    name: 'Trà Đào Cam Sả Tươi',
    category: 'tea',
    price: 38000,
    tag: 'Best-seller',
    image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=600&q=80',
    description: 'Vị thanh ngọt của trà đen, cam vàng mọng nước, thơm lừng hương sả tươi và đào giòn ướp lạnh.',
  },
  {
    id: 'drink-04',
    name: 'Trà Vải Hoa Lài Macchiato',
    category: 'tea',
    price: 42000,
    tag: 'Yêu thích',
    image: 'https://images.unsplash.com/photo-1595981267035-7b04ca84a82d?auto=format&fit=crop&w=600&q=80',
    description: 'Nước cốt trà hoa lài ngát hương quyện cùng trái vải mọng nước và lớp milk foam phô mai sánh mịn.',
  },
  {
    id: 'drink-05',
    name: 'Trà Sữa Trân Châu Hoàng Gia',
    category: 'milktea_smoothie',
    price: 45000,
    tag: 'Hot',
    image: 'https://images.unsplash.com/photo-1541658016709-82535e94bc69?auto=format&fit=crop&w=600&q=80',
    description: 'Trà đen Ceylon đậm vị sữa kem New Zealand, đi kèm trân châu đen hoàng gia dẻo mềm óng ánh.',
  },
  {
    id: 'drink-06',
    name: 'Matcha Latte Kem Phô Mai',
    category: 'milktea_smoothie',
    price: 48000,
    tag: 'Đặc sắc',
    image: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=600&q=80',
    description: 'Bột matcha thượng hạng vùng Uji Nhật Bản kết hợp sữa tươi nguyên kem và váng phô mai béo ngậy.',
  },
  {
    id: 'drink-07',
    name: 'Sinh Tố Bơ Dừa Sáp Thượng Hạng',
    category: 'milktea_smoothie',
    price: 45000,
    tag: 'Mới',
    image: 'https://images.unsplash.com/photo-1623065422902-30a2d299bbe4?auto=format&fit=crop&w=600&q=80',
    description: 'Bơ 034 Tây Nguyên dẻo quánh xay cùng dừa xiêm và sữa đặc, thơm bùi ngập tràn năng lượng.',
  },
  {
    id: 'drink-08',
    name: 'Nước Ép Cam Tươi Nguyên Chất',
    category: 'tea',
    price: 35000,
    tag: 'Healthy',
    image: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=600&q=80',
    description: '100% cam sành vắt tay nguyên chất không pha nước, mọng tép cam tươi giàu Vitamin C tăng đề kháng.',
  },
  {
    id: 'drink-09',
    name: 'Cacao Khói Đá Xay Marshmallow',
    category: 'milktea_smoothie',
    price: 46000,
    tag: 'Ngọt ngào',
    image: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80',
    description: 'Cacao nguyên chất xay nhuyễn cùng đá tuyết, phủ sốt chocolate đắng nhẹ và kẹo dẻo nướng bồng bềnh.',
  },
  {
    id: 'drink-10',
    name: 'Trà Sen Vàng Hạt Sen Thơm Bùi',
    category: 'tea',
    price: 45000,
    tag: 'Thanh mát',
    image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=600&q=80',
    description: 'Trà Oolong thanh khiết hòa quyện cùng hạt sen Huế ninh mềm bùi béo và củ năng giòn sần sật.',
  },
];

export const TABLES = [
  { id: 1, name: 'Bàn 01', area: 'Tầng 1 - Sân vườn' },
  { id: 2, name: 'Bàn 02', area: 'Tầng 1 - Trong nhà' },
  { id: 3, name: 'Bàn 03', area: 'Tầng 1 - Cửa sổ' },
  { id: 4, name: 'Bàn 04', area: 'Tầng 2 - Ban công' },
  { id: 5, name: 'Bàn 05', area: 'Tầng 2 - Phòng lạnh' },
];

export const formatMoney = (amount) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

