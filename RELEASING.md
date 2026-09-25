# Web sürümünü yayınlama

1. Ortam değişkenlerinde `VITE_API_URL` değerini cloud API adresine ayarlayın.
2. `npm run build` komutunu çalıştırın.
3. Oluşan `dist` klasörünü statik web sunucusuna yükleyin.

Uygulama `HashRouter` kullandığı için sunucuda ek SPA yönlendirme kuralı gerekmez.
