/* Service Worker fuer das Stadtfest-Spiel.
   Zweck: Das Spiel muss am Messestand auch dann starten, wenn das WLAN weg ist.
   Die Seite selbst braucht kein Netz (Three.js und beide Schriften stecken in
   der HTML-Datei), aber ohne diesen Worker kaeme Safari gar nicht erst an die
   Adresse heran.

   Aendert sich das Spiel, muss VERSION hochgezaehlt werden. Sonst haelt der
   Cache die alte Fassung fest und niemand sieht die Aenderung. */
const VERSION = 'bfa-v1';
const DATEIEN = ['./', './index.html'];

self.addEventListener('install', e => {
  /* Einzeln laden statt addAll: faellt eine Adresse aus, scheitert sonst die
     ganze Installation und der Worker uebernimmt nie. */
  e.waitUntil(
    caches.open(VERSION)
      .then(c => Promise.all(DATEIEN.map(d => c.add(d).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(namen => Promise.all(namen.filter(n => n !== VERSION).map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const anfrage = e.request;
  if (anfrage.method !== 'GET') return;
  if (new URL(anfrage.url).origin !== self.location.origin) return;

  e.respondWith(
    caches.match(anfrage).then(treffer => {
      if (treffer) return treffer;
      return fetch(anfrage)
        .then(antwort => {
          if (antwort && antwort.ok && antwort.type === 'basic') {
            const kopie = antwort.clone();
            caches.open(VERSION).then(c => c.put(anfrage, kopie));
          }
          return antwort;
        })
        .catch(() => {
          /* Kein Netz und nichts im Cache. Beim Seitenaufruf die Startseite
             ausliefern, damit das Spiel trotzdem hochkommt. */
          if (anfrage.mode === 'navigate') return caches.match('./index.html');
          return Response.error();
        });
    })
  );
});
