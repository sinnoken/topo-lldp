/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./index.html",         // 確保有這行
        "./*.html",          // 掃描根目錄下的所有 HTML
        "./js/**/*.js",      // 如果你的 JS 裡有動態產生 class，也要掃描
        "./js/**/*.json",    // 掃描 JSON（如果你裡面有存 class 名稱）
    ],
    theme: {
        extend: {
            fontFamily: {
                'google-sans': ['Google Sans', 'sans-serif'],
            },
        },
    },
    plugins: [require("daisyui")],
    daisyui: {
        themes: ["light"], // 這裡越少，檔案越小
    },
}