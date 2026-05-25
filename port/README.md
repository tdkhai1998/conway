# Inject V3 vào repo `tdkhai1998/conway`

Bản port này là single-file drop-in cho repo Vite + React + Tailwind hiện tại của bạn.

## Cài đặt

1. **Copy file** `CellularAutomataDemo.jsx` (trong folder `port/`) đè lên file cùng tên trong repo:

   ```
   conway/
   ├── src/
   │   ├── App.jsx
   │   ├── CellularAutomataDemo.jsx   ← thay file này
   │   ├── index.css
   │   └── main.jsx
   ```

   Hoặc nếu file gốc nằm ở root (như version master hiện tại), thì copy đè vào đó.

2. **Đảm bảo Tailwind safelist** các class màu động (`bg-sky-400`, `bg-violet-500`, etc.). Vì code có template strings dạng `bg-${p.color}`, Tailwind JIT đôi khi không quét được. Thêm vào `tailwind.config.js`:

   ```js
   export default {
     content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}", "./CellularAutomataDemo.jsx"],
     safelist: [
       'bg-sky-400', 'bg-sky-500',
       'bg-cyan-500',
       'bg-emerald-500',
       'bg-violet-500', 'bg-violet-600',
       'bg-rose-500',
       'bg-pink-500',
       'bg-red-600',
       'bg-yellow-600',
       'shadow-sky-500/50', 'shadow-violet-600/50', 'shadow-red-600/50',
       'ring-sky-400/80',
     ],
     theme: { extend: {} },
     plugins: [],
   };
   ```

3. **Chạy dev server**:

   ```bash
   npm run dev
   ```

4. **Deploy như cũ**:

   ```bash
   npm run deploy
   ```

## Những gì thay đổi so với version cũ

| | Trước | Sau (V3) |
|---|---|---|
| Layout | Canvas + footer dài 45vh chứa hết controls | Canvas full-bleed + HUD glass floating |
| Controls | Hàng dài 12+ buttons | 6 icons trong capsule + 3 sheets on-demand |
| Mobile-fit | Footer chiếm gần nửa màn hình | Canvas tận dụng 100% chiều cao |
| Speed | Cố định 70ms/tick | 4 mức: ⅓× / 1× / 2× / 4× |
| Modes | Buttons rời | Segmented chip nhỏ ở top-left |
| Generation | Không hiển thị | Counter ở top-right |
| Rule editor | Inline, luôn hiện | Trong Rules sheet (mở khi cần) |

## Cấu trúc engine không đổi

- Hàm `stepLife()`, `stepBrain()`, `countOn()` giữ nguyên logic 1:1 với version gốc
- Patterns array (glider, pulsar, gosperGun, neuronFiring, …) y nguyên
- Color tokens vẫn là sky-400 cho ON, violet-600 cho DYING — match bản gốc

Có thể đè trực tiếp mà không sợ break test (nếu có).

## Caveats

- Speed dial dùng `setInterval` re-create khi `tickMs` đổi — đủ tốt nhưng nếu muốn frame-perfect timing thì cân nhắc `requestAnimationFrame`.
- Class `bg-${p.color}` trong `PatternThumb` cần safelist (đã list ở trên).
- Code dùng `pointer events` — modern browsers OK, IE11 thì không (chắc bạn không quan tâm).
- File ~580 lines. Nếu muốn mình split thành nhiều file (engine / hud / sheets) thì báo nhé.
