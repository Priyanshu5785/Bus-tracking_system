import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { io } from "socket.io-client";
import { api, SERVER } from "./api.js";

const busIcon = L.divIcon({ className: "", html: '<div class="bus-dot"></div>', iconSize: [28, 28] });
const stopIcon = L.divIcon({ className: "", html: '<div class="stop-dot"></div>', iconSize: [14, 14] });

const toRad = (d) => (d * Math.PI) / 180;
function meters(a, b) {
  const R = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
const fmt = (m) => (m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`);

function Follow({ pos }) {
  const map = useMap();
  useEffect(() => { if (pos) map.flyTo([pos.lat, pos.lng], Math.max(map.getZoom(), 15)); }, [pos]);
  return null;
}

export default function Student({ session }) {
  const [buses, setBuses] = useState([]);
  const [busId, setBusId] = useState("");
  const [pos, setPos] = useState(null);
  const [active, setActive] = useState(false);
  const [stopIdx, setStopIdx] = useState("");
  const [speed, setSpeed] = useState(null);
  const [near, setNear] = useState(false);
  const history = useRef([]);
  const alerted = useRef(false);

  useEffect(() => {
    api("/api/buses", { token: session.token }).then((b) => { setBuses(b); if (b[0]) setBusId(b[0]._id); });
  }, []);

  useEffect(() => {
    if (!busId) return;
    setPos(null); setSpeed(null); setNear(false); setStopIdx("");
    history.current = [];
    alerted.current = false;
    const socket = io(SERVER, { auth: { token: session.token } });
    socket.emit("bus:join", busId);
    socket.on("location:update", (d) => {
      if (d.busId !== busId) return;
      setPos(d);
      setActive(d.active);
      const h = history.current;
      h.push({ lat: d.lat, lng: d.lng, t: new Date(d.at).getTime() });
      if (h.length > 6) h.shift();
      const secs = (h[h.length - 1].t - h[0].t) / 1000;
      if (secs >= 3) setSpeed(meters(h[0], h[h.length - 1]) / secs);
    });
    socket.on("trip:status", (d) => { if (d.busId === busId) setActive(d.active); });
    return () => socket.disconnect();
  }, [busId]);

  const bus = buses.find((b) => b._id === busId);
  const target = bus && stopIdx !== "" ? bus.stops[Number(stopIdx)] : null;

  const moving = speed > 1.5 || pos?.speed > 1.5;
  const used = speed > 1.5 ? speed : pos?.speed > 1.5 ? pos.speed : 5.5;
  const dist = pos && target ? meters(pos, target) * 1.3 : null;
  const minutes = dist != null ? Math.max(1, Math.round(dist / used / 60)) : null;

  useEffect(() => {
    if (dist == null || !active) return;
    if (dist > 1200) {
      alerted.current = false;
      setNear(false);
    } else if (!alerted.current && (dist <= 600 || minutes <= 5)) {
      alerted.current = true;
      setNear(true);
      navigator.vibrate?.(300);
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("Your bus is near", { body: `${bus.number} is about ${minutes} min from ${target.name}` });
      }
    }
  }, [pos]);

  function chooseStop(value) {
    setStopIdx(value);
    alerted.current = false;
    setNear(false);
    if ("Notification" in window && Notification.permission === "default") Notification.requestPermission();
  }

  return (
    <main className="student">
      <select value={busId} onChange={(e) => setBusId(e.target.value)} aria-label="Choose bus">
        {buses.map((b) => <option key={b._id} value={b._id}>{b.number} — {b.routeName}</option>)}
      </select>
      <select value={stopIdx} onChange={(e) => chooseStop(e.target.value)} aria-label="Choose your stop">
        <option value="">Choose my stop for ETA</option>
        {bus?.stops.map((s, i) => <option key={i} value={i}>{s.name}</option>)}
      </select>

      <p className={active ? "live" : "sub"}>
        {active ? "Bus is on the road" : pos ? "Trip ended. Showing last known spot." : "Waiting for the bus to start."}
      </p>

      {near && <div className="near">Your bus is near {target?.name}. Get ready!</div>}
      {target && active && pos && (
        <div className="eta">
          <strong>About {minutes} min away</strong>
          <span>{fmt(dist)} from {target.name} · {moving ? "based on bus speed" : "assuming 20 km/h"}</span>
        </div>
      )}
      {target && !active && <p className="sub">ETA appears once the bus starts its trip.</p>}

      <MapContainer center={[28.6139, 77.209]} zoom={13} className="map">
        <TileLayer attribution="© OpenStreetMap contributors" url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {bus?.stops.map((s, i) => (
          <Marker key={i} position={[s.lat, s.lng]} icon={stopIcon}><Popup>{s.name}</Popup></Marker>
        ))}
        {pos && <Marker position={[pos.lat, pos.lng]} icon={busIcon}><Popup>{bus?.number}</Popup></Marker>}
        <Follow pos={pos} />
      </MapContainer>
    </main>
  );
}
