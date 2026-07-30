import React, {
  useRef, useMemo, useEffect, useImperativeHandle, forwardRef,
} from 'react';
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';

const KARACHI = { lat: 24.8607, lng: 67.0011 };

const MapLoader = ({ isDark }) => (
  <View style={[styles.loader, { backgroundColor: isDark ? '#0d1a12' : '#e8f5e9' }]}>
    <ActivityIndicator size="large" color={isDark ? '#4ade80' : '#1e4620'} />
    <Text style={[styles.loaderText, { color: isDark ? '#4ade80' : '#1e4620' }]}>
      Loading Map…
    </Text>
  </View>
);

const DARK_TILE  = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const LIGHT_TILE = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

const LeafletMap = forwardRef(
  ({ isDark, complaints = [], userLocation, onLocationSelect, onComplaintClick, onMapInteraction, showReportingPin = false, droppedPinLocation = null }, ref) => {
    const webViewRef = useRef(null);
    const mapReady   = useRef(false);
    const lastUserLoc = useRef(null);
    const isDarkRef  = useRef(isDark);

    // ── Safe bridge: send messages from RN → WebView ──────────────
    const sendToMap = (msg) => {
      if (!webViewRef.current || !mapReady.current) return;
      try {
        const payload = JSON.stringify(JSON.stringify(msg));
        webViewRef.current.injectJavaScript(
          `(function(){try{window.__bridge(${payload})}catch(e){console.warn('bridge err',e)}})();true;`
        );
      } catch (e) {
        console.warn('sendToMap error:', e);
      }
    };

    // ── Expose API to NakshaScreen via ref ─────────────────────────
    useImperativeHandle(ref, () => ({
      panToUser: (loc) => sendToMap({ type: 'USER_LOC', lat: loc.lat, lng: loc.lng, pan: true }),
      panTo:     (loc, zoom) => sendToMap({ type: 'PAN_TO', lat: loc.lat, lng: loc.lng, zoom }),
      panToKeepZoom: (loc) => sendToMap({ type: 'PAN_TO_KEEP_ZOOM', lat: loc.lat, lng: loc.lng }),
      zoomIn:    () => sendToMap({ type: 'ZOOM_IN' }),
      zoomOut:   () => sendToMap({ type: 'ZOOM_OUT' }),
    }));

    // ── Sync userLocation changes into the map ─────────────────────
    useEffect(() => {
      if (userLocation && mapReady.current) {
        const isSame = lastUserLoc.current && 
                       lastUserLoc.current.lat === userLocation.lat && 
                       lastUserLoc.current.lng === userLocation.lng;
        if (!isSame) {
          lastUserLoc.current = userLocation;
          sendToMap({ type: 'USER_LOC', lat: userLocation.lat, lng: userLocation.lng, pan: false });
        }
      }
    }, [userLocation]);

    // ── Send theme changes into the live map without reloading ────
    const isFirstRender = useRef(true);
    useEffect(() => {
      // Skip the initial mount — the HTML is already built with the correct tile.
      if (isFirstRender.current) {
        isFirstRender.current = false;
        return;
      }
      isDarkRef.current = isDark;
      // Only send if map is already ready; READY handler restores state after any reload.
      if (mapReady.current) {
        sendToMap({
          type: 'CHANGE_THEME',
          tileUrl: isDark ? DARK_TILE : LIGHT_TILE,
          bg: isDark ? '#181818' : '#f2f2f2',
        });
      }
    }, [isDark]);

    // ── Sync complaint markers into the map ────────────────────────
    useEffect(() => {
      if (mapReady.current) {
        sendToMap({ type: 'COMPLAINTS', items: complaints, clear: true });
      }
    }, [complaints]);

    // ── Sync pin visibility ────────────────────────────────────────
    useEffect(() => {
      if (mapReady.current) {
        sendToMap({ type: 'SET_PIN_VISIBLE', visible: showReportingPin });
      }
    }, [showReportingPin]);

    // ── HTML is built once. Theme changes are handled via bridge. ────
    const mapHtml = useMemo(() => {
      const tileUrl = isDarkRef.current ? DARK_TILE : LIGHT_TILE;

      return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 100%; height: 100%; overflow: hidden; }
  #map { width: 100vw; height: 100vh; background: ${isDarkRef.current ? '#181818' : '#f2f2f2'}; }
  .leaflet-control-attribution,
  .leaflet-control-zoom { display: none !important; }

  /* ── Eliminate inter-tile seam lines ────────────────────────────────────
     On mobile WebViews, sub-pixel rendering creates 1-px gaps between tiles.
     The container background bleeds through these gaps as a visible grid.
     Force each tile onto its own GPU compositing layer and remove all border/
     margin so tiles are seamlessly flush. */
  .leaflet-tile-pane img,
  .leaflet-tile {
    border: 0 !important;
    outline: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
    display: block;
    -webkit-transform: translateZ(0);
    transform: translateZ(0);
    will-change: transform;
    -webkit-backface-visibility: hidden;
    backface-visibility: hidden;
  }

  @keyframes pulse {
    0%   { transform: scale(1);   opacity: .9; }
    65%  { transform: scale(3.5); opacity: 0; }
    100% { transform: scale(1);   opacity: 0; }
  }
  @keyframes userPulse {
    0%   { transform: translate(-50%, -50%) scale(0.3); opacity: 1; }
    80%  { transform: translate(-50%, -50%) scale(1.2); opacity: 0; }
    100% { transform: translate(-50%, -50%) scale(1.2); opacity: 0; }
  }

  .pin-wrap {
    position: relative; width: 34px; height: 40px;
    display: flex; align-items: flex-start; justify-content: center;
  }
  .pin-svg {
    filter: drop-shadow(0px 4px 8px rgba(0,0,0,0.45));
    position: relative; z-index: 2;
  }
  .pin-svg.bounce {
    animation: pinBounce 0.4s ease-out forwards;
  }
  .pin-halo {
    width: 20px; height: 8px;
    background: rgba(22,163,74,0.3);
    border-radius: 50%;
    position: absolute; bottom: 0; left: 50%;
    transform: translateX(-50%);
  }
  @keyframes pinBounce {
    0%   { transform: translateY(-12px); opacity: 0; }
    60%  { transform: translateY(3px); }
    100% { transform: translateY(0); opacity: 1; }
  }

  .user-wrap {
    position: relative; width: 36px; height: 36px;
    display: flex; align-items: center; justify-content: center;
  }
  .user-arrow {
    position: relative; z-index: 2;
    animation: floatArrow 3s ease-in-out infinite;
    filter: drop-shadow(0px 4px 6px rgba(0,0,0,0.4));
  }
  .user-pulse {
    width: 64px; height: 64px;
    background: radial-gradient(circle, rgba(34,197,94,0.4) 0%, rgba(34,197,94,0) 70%);
    border-radius: 50%;
    position: absolute; top: 6px; left: 18px;
    transform: translate(-50%, -50%);
    animation: userPulse 2.5s infinite ease-out;
    pointer-events: none; z-index: 1;
  }
  @keyframes floatArrow {
    0%, 100% { transform: translateY(0px); }
    50%      { transform: translateY(-4px); }
  }
  @keyframes userPulse {
    0%   { transform: translate(-50%, -50%) scale(0.3); opacity: 1; }
    80%  { transform: translate(-50%, -50%) scale(1.2); opacity: 0; }
    100% { transform: translate(-50%, -50%) scale(1.2); opacity: 0; }
  }

  .c-dot {
    width: 14px; height: 14px; border-radius: 50%;
    border: 2.5px solid rgba(255,255,255,.9);
    box-shadow: 0 2px 6px rgba(0,0,0,.4);
    transition: width 0.1s, height 0.1s;
    cursor: pointer;
  }
  .c-dot.micro  { width: 6px; height: 6px; border-width: 1px; }
  .c-dot.small  { width: 9px; height: 9px; border-width: 1.5px; }
  .c-dot.medium { width: 12px; height: 12px; border-width: 2px; }
  .c-dot.large  { width: 15px; height: 15px; border-width: 2.5px; }

  .c-dot-own {
    width: 14px; height: 14px; border-radius: 50%;
    background: #ffffff;
    border-style: solid;
    border-width: 4px;
    box-shadow: 0 3px 8px rgba(0,0,0,.5);
    cursor: pointer;
    transition: width 0.1s, height 0.1s, border-width 0.1s;
    position: relative; z-index: 10;
  }
  .c-dot-own.micro  { width: 8px; height: 8px; border-width: 2px; }
  .c-dot-own.small  { width: 11px; height: 11px; border-width: 3px; }
  .c-dot-own.medium { width: 14px; height: 14px; border-width: 4px; }
  .c-dot-own.large  { width: 17px; height: 17px; border-width: 5px; }
</style>
</head>
<body>
<div id="map"></div>
<script>
  var map = L.map('map', { 
    zoomControl: false, attributionControl: false,
    dragging: true, touchZoom: true, doubleClickZoom: true, scrollWheelZoom: true,
    tap: false
  }).setView([${KARACHI.lat}, ${KARACHI.lng}], 13);
  window._tileLayer = L.tileLayer('${tileUrl}', { maxZoom: 19 }).addTo(map);

  var pinMarker = null, userMarker = null;
  var markers = {}, complaintData = {};
  var pinVisible = false;
  var _ignoreNextMove = false;

  function safePost(obj) {
    try { window.ReactNativeWebView.postMessage(JSON.stringify(obj)); } catch(e) {}
  }

  function setPinVisible(visible) {
    pinVisible = visible;
    if (!visible && pinMarker) {
      map.removeLayer(pinMarker); pinMarker = null;
      safePost({ type: 'LOCATION_CLEARED' });
    }
  }

  function makePinIcon(animate) {
    var bc = animate ? ' bounce' : '';
    return L.divIcon({
      className: '', iconSize: [24, 28], iconAnchor: [12, 28],
      html: "<div class='pin-wrap'><svg class='pin-svg" + bc + "' viewBox='0 0 34 40' width='24' height='28'><path d='M17 1 C8.163 1 1 8.163 1 17 C1 28.5 17 39 17 39 C17 39 33 28.5 33 17 C33 8.163 25.837 1 17 1 Z' fill='#16a34a' stroke='#fff' stroke-width='2'/><circle cx='17' cy='17' r='6' fill='#fff' opacity='0.9'/></svg><div class='pin-halo'></div></div>"
    });
  }
  var stablePinIcon = makePinIcon(false);

  function makeUserIcon() {
    return L.divIcon({
      className: '', iconSize: [36, 36], iconAnchor: [18, 6],
      html: "<div class='user-wrap'><div class='user-pulse'></div><svg class='user-arrow' viewBox='0 0 24 24' width='28' height='28'><path d='M12 2L21 21L12 17L3 21L12 2Z' fill='#22C55E' stroke='#ffffff' stroke-width='2' stroke-linejoin='round' /></svg></div>"
    });
  }

  function getDotSizeClass() {
    var z = map.getZoom();
    if (z <= 11) return 'micro';
    if (z <= 13) return 'small';
    if (z <= 15) return 'medium';
    return 'large';
  }
  function makeComplaintIcon(color, isOwn) {
    var sc = getDotSizeClass();
    if (isOwn) {
      return L.divIcon({
        className: '', iconSize: [16, 16], iconAnchor: [8, 8],
        html: "<div class='c-dot-own " + sc + "' style='border-color:" + color + ";'></div>"
      });
    }
    return L.divIcon({
      className: '', iconSize: [14, 14], iconAnchor: [7, 7],
      html: "<div class='c-dot " + sc + "' style='background:" + color + "'></div>"
    });
  }

  function dropPin(lat, lng, silent) {
    if (!pinVisible && !silent) return;
    if (pinMarker) {
      pinMarker.setLatLng([lat, lng]);
      if (!silent) pinMarker.setIcon(makePinIcon(true));
    } else {
      pinMarker = L.marker([lat, lng], { icon: makePinIcon(!silent), zIndexOffset: 2000 }).addTo(map);
    }
    if (!silent) safePost({ type: 'LOCATION_SELECTED', lat: lat, lng: lng });
  }

  var _sx=0, _sy=0, _st=0, _dragged=false;
  var mapEl = map.getContainer();
  mapEl.addEventListener('touchstart', function(e) {
    if (e.touches.length!==1) return;
    _sx=e.touches[0].pageX; _sy=e.touches[0].pageY; _st=Date.now(); _dragged=false;
  }, { passive: true });
  mapEl.addEventListener('touchmove', function(e) {
    if (e.touches.length!==1) return;
    if (Math.abs(e.touches[0].pageX-_sx)>6 || Math.abs(e.touches[0].pageY-_sy)>6) _dragged=true;
  }, { passive: true });
  mapEl.addEventListener('touchend', function(e) {
    if (e.changedTouches.length!==1) return;
    if (_dragged || Date.now()-_st>400) return;
    // If the tap target is a complaint dot, let the marker click handler take over
    var target = e.target || e.srcElement;
    if (target && (target.classList.contains('c-dot') || target.classList.contains('c-dot-own'))) return;
    var t=e.changedTouches[0], box=mapEl.getBoundingClientRect();
    var cp=L.point(t.clientX-box.left, t.clientY-box.top);
    var ll=map.containerPointToLatLng(cp);
    dropPin(ll.lat, ll.lng, false);
    e.preventDefault();
  }, { passive: false });

  setPinVisible(false);

  // Notify RN when user manually drags/zooms (dismiss popup)
  map.on('dragstart', function() {
    if (!_ignoreNextMove) safePost({ type: 'MAP_INTERACTION', reason: 'drag' });
  });
  map.on('zoomstart', function() {
    if (!_ignoreNextMove) safePost({ type: 'MAP_INTERACTION', reason: 'zoom' });
  });

  function updateUser(lat, lng, pan) {
    var ll = [lat, lng];
    if (!userMarker) {
      userMarker = L.marker(ll, { icon: makeUserIcon(), zIndexOffset: 100, interactive: false }).addTo(map);
    } else {
      userMarker.setLatLng(ll);
    }
    if (pan) {
      _ignoreNextMove = true;
      var cc = map.getCenter();
      var dist = map.distance(cc, L.latLng(lat, lng));
      if (dist > 5 || map.getZoom() !== 16) {
        if (dist < 1000 && map.getZoom() === 16) {
          map.panTo(ll, { animate: true, duration: 1.2, easeLinearity: 0.15 });
        } else {
          map.flyTo(ll, 16, { animate: true, duration: 2.0, easeLinearity: 0.1 });
        }
      }
      setTimeout(function() { _ignoreNextMove = false; }, 2500);
    }
  }

  var CAT_COLOR = {
    'Sewerage':'#3B82F6','Broken Roads':'#F59E0B','Waste':'#22C55E','Kunda':'#EF4444','Encroachment':'#8B5CF6'
  };

  var _occupiedSpots = {};

  function addComplaints(items, clearFirst) {
    if (clearFirst) { 
      for (var id in markers) { map.removeLayer(markers[id]); } 
      markers = {}; 
      complaintData = {}; 
      _occupiedSpots = {};
      
      // Pre-seed the user's location so complaints scatter around the arrow tip
      if (userMarker) {
        var uLat = userMarker.getLatLng().lat;
        var uLng = userMarker.getLatLng().lng;
        _occupiedSpots[uLat.toFixed(5) + ',' + uLng.toFixed(5)] = 1;
      }
    }
    
    (items||[]).forEach(function(c) {
      if (markers[c.id] || !c.coords) return;
      var color = CAT_COLOR[c.category] || '#EF4444';
      
      var lat = c.coords.lat;
      var lng = c.coords.lng;
      var key = lat.toFixed(5) + ',' + lng.toFixed(5);
      var count = _occupiedSpots[key] || 0;
      
      if (count > 0) {
        // Scatter multiple pins at the exact same location in a spiral/circle
        var angle = count * (Math.PI / 3); // 60 degrees apart
        var radius = 0.00015 + (Math.floor(count / 6) * 0.0001); // Increase radius if many pins
        lat += Math.cos(angle) * radius;
        lng += Math.sin(angle) * radius;
      }
      _occupiedSpots[key] = count + 1;

      var m = L.marker([lat, lng], { icon: makeComplaintIcon(color, c.isOwnReport), zIndexOffset: c.isOwnReport ? 800 : 500 }).addTo(map);
      m.on('click', function(e) {
        // Suppress complaint popup when the user is in pin-dropping / reporting mode
        if (pinVisible) return;
        L.DomEvent.stopPropagation(e);
        // Pan to complaint at current zoom, then notify RN
        _ignoreNextMove = true;
        map.panTo([c.coords.lat, c.coords.lng], { animate: true, duration: 0.6 });
        setTimeout(function() { _ignoreNextMove = false; }, 1000);
        safePost({ type: 'COMPLAINT_CLICKED', id: c.id, lat: c.coords.lat, lng: c.coords.lng });
      });
      markers[c.id] = m;
      complaintData[c.id] = c;
    });
  }

  map.on('zoomend', function() {
    for (var id in markers) {
      var c = complaintData[id];
      if (c) markers[id].setIcon(makeComplaintIcon(CAT_COLOR[c.category]||'#EF4444', c.isOwnReport));
    }
  });

  window.__bridge = function(raw) {
    var msg; try { msg = JSON.parse(raw); } catch(e) { return; }
    switch (msg.type) {
      case 'USER_LOC': updateUser(msg.lat, msg.lng, !!msg.pan); break;
      case 'PAN_TO': map.flyTo([msg.lat, msg.lng], msg.zoom || map.getZoom(), { duration: 1 }); break;
      case 'PAN_TO_KEEP_ZOOM':
        _ignoreNextMove = true;
        map.panTo([msg.lat, msg.lng], { animate: true, duration: 0.6 });
        setTimeout(function() { _ignoreNextMove = false; }, 1000);
        break;
      case 'COMPLAINTS': addComplaints(msg.items, !!msg.clear); break;
      case 'ZOOM_IN': map.zoomIn(); break;
      case 'ZOOM_OUT': map.zoomOut(); break;
      case 'SET_PIN_VISIBLE': setPinVisible(msg.visible); break;
      case 'RESTORE_PIN': dropPin(msg.lat, msg.lng, true); pinVisible = true; break;
      case 'CHANGE_THEME':
        if (window._tileLayer) { map.removeLayer(window._tileLayer); }
        window._tileLayer = L.tileLayer(msg.tileUrl, { maxZoom: 19 }).addTo(map);
        // Swap map background so seam colour matches the new tiles
        document.getElementById('map').style.background = msg.bg;
        break;
    }
  };
  map.whenReady(function() { safePost({ type: 'READY' }); });
</script>
</body>
</html>`;
    }, []);

    // ── Handle messages from WebView → RN ─────────────────────────
    const onMessage = (event) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        if (data.type === 'READY') {
          mapReady.current = true;
          if (userLocation) {
            sendToMap({ type: 'USER_LOC', lat: userLocation.lat, lng: userLocation.lng, pan: false });
          }
          if (complaints.length > 0) {
            sendToMap({ type: 'COMPLAINTS', items: complaints, clear: true });
          }
          sendToMap({ type: 'SET_PIN_VISIBLE', visible: showReportingPin });
          if (droppedPinLocation) {
            sendToMap({ type: 'RESTORE_PIN', lat: droppedPinLocation.lat, lng: droppedPinLocation.lng });
          }
        }
        if (data.type === 'LOCATION_SELECTED') {
          onLocationSelect?.({ lat: data.lat, lng: data.lng });
        }
        if (data.type === 'COMPLAINT_CLICKED') {
          onComplaintClick?.(data.id, { lat: data.lat, lng: data.lng });
        }
        if (data.type === 'MAP_INTERACTION') {
          onMapInteraction?.(data.reason);
        }
      } catch (error) {
        console.error('LeafletMap onMessage Error:', error);
      }
    };

    const webViewSource = useMemo(
      () => ({ html: mapHtml, baseUrl: 'https://openstreetmap.org' }),
      [mapHtml]
    );

    return (
      <View style={styles.container}>
        <WebView
          ref={webViewRef}
          originWhitelist={['*']}
          source={webViewSource}
          style={styles.webview}
          startInLoadingState={true}
          renderLoading={() => <MapLoader isDark={isDark} />}
          onMessage={onMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          mixedContentMode="always"
          allowUniversalAccessFromFileURLs={true}
          userAgent="KCP-App/1.0"
          scrollEnabled={false}
          overScrollMode="never"
          bounces={false}
          scalesPageToFit={false}
          setBuiltInZoomControls={true}
          setDisplayZoomControls={false}
          onError={(e) => console.warn('WebView error:', e.nativeEvent.description)}
        />
      </View>
    );
  }
);

LeafletMap.displayName = 'LeafletMap';

const styles = StyleSheet.create({
  container: { flex: 1 },
  webview:   { flex: 1, backgroundColor: 'transparent' },
  loader: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center', alignItems: 'center', zIndex: 10,
  },
  loaderText: {
    marginTop: 12, fontSize: 14, fontWeight: '700',
  },
});

export default LeafletMap;
