/* Service Worker fuer das Stadtfest-Spiel.
   Zweck: Das Spiel muss am Messestand auch dann starten, wenn das WLAN weg ist.
   Die Seite selbst braucht kein Netz (Three.js und beide Schriften stecken in
   der HTML-Datei), aber ohne diesen Worker kaeme Safari gar nicht erst an die
   Adresse heran.

   Aendert sich das Spiel, muss VERSION hochgezaehlt werden. Sonst haelt der
   Cache die alte Fassung fest und niemand sieht die Aenderung. */
const VERSION = 'bfa-v2';
const PRAEFIX = 'bfa-';
const DATEIEN = ['./', './index.html'];

self.addEventListener('install', e => {
  /* addAll statt einzeln mit verschlucktem Fehler: Bricht das WLAN mitten in
     der Installation ab, scheitert die Installation absichtlich. Der alte
     Worker bleibt dann mit vollem Cache aktiv. Vorher konnte ein Worker mit
     leerem Cache uebernehmen und den funktionierenden alten loeschen. */
  e.waitUntil(
    caches.open(VERSION)
      .then(c => c.addAll(DATEIEN))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  /* Nur eigene Caches aufraeumen. Cache Storage gilt fuer die ganze Domain,
     nicht nur fuer diesen Unterordner. Ohne die Praefix-Pruefung wuerde der
     Worker die Caches anderer Lernseiten derselben Adresse mitloeschen. */
  e.waitUntil(
    caches.keys()
      .then(namen => Promise.all(
        namen.filter(n => n.startsWith(PRAEFIX) && n !== VERSION)
             .map(n => caches.delete(n))
      ))
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
          /* status===200 statt antwort.ok: ok schliesst 206 Teilantworten ein,
             die cache.put() ablehnt. Das warf eine unbehandelte Ablehnung. */
          if (antwort && antwort.status === 200 && antwort.type === 'basic') {
            const kopie = antwort.clone();
            caches.open(VERSION).then(c => c.put(anfrage, kopie)).catch(() => {});
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
