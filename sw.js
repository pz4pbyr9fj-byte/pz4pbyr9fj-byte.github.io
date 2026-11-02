/* Calme 卡片集 Service Worker
   策略：缓存优先 + 后台静默更新（stale-while-revalidate）
   - 打开任何页面：立刻从本地缓存出图，不等网络
   - 同时后台下载最新版写入缓存，下次打开即为新版
   - 不再「升版本 = 清空全部缓存重下」，避免每次更新后首次打开变慢
*/
var CACHE = "wishcard-core";

self.addEventListener("install", function (e) {
  /* 不做全量预缓存：只接管，页面在首次访问时按需缓存 */
  e.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (ks) {
      /* 只清理旧命名规则的缓存（wishcard-vN），wishcard-core 永久保留 */
      return Promise.all(ks.map(function (k) {
        return k === CACHE ? null : caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  var url;
  try { url = new URL(e.request.url); } catch (err) { return; }
  if (url.origin !== self.location.origin) return;   /* 外部资源不接管 */

  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(function (hit) {
      var net = fetch(e.request).then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          /* 缓存键去掉 ?v= 之类的查询串，避免同一文件存多份 */
          var key = new Request(url.origin + url.pathname);
          caches.open(CACHE).then(function (c) { c.put(key, copy); }).catch(function () {});
        }
        return res;
      }).catch(function () { return hit; });
      return hit || net;
    })
  );
});
