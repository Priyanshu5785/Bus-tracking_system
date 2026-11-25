import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { api } from "./api.js";

const stopIcon = L.divIcon({ className: "", html: '<div class="stop-dot"></div>', iconSize: [14, 14] });

function Picker({ onPick }) {
  useMapEvents({ click: (e) => onPick(e.latlng) });
  return null;
}

function Fly({ pos }) {
  const map = useMap();
  useEffect(() => { if (pos) map.setView(pos, 14); }, [pos]);
  return null;
}

export default function Admin({ session }) {
  const { token } = session;
  const [buses, setBuses] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [form, setForm] = useState({ number: "", routeName: "", driver: "" });
  const [stops, setStops] = useState([]);
  const [driverForm, setDriverForm] = useState({ name: "", email: "", password: "" });
  const [note, setNote] = useState({ text: "", bad: false });
  const [here, setHere] = useState(null);

  async function load() {
    setBuses(await api("/api/buses", { token }));
    setDrivers(await api("/api/drivers", { token }));
  }

  useEffect(() => {
    load();
    navigator.geolocation?.getCurrentPosition((p) => setHere([p.coords.latitude, p.coords.longitude]));
  }, []);

  async function run(fn, okText) {
    setNote({ text: "", bad: false });
    try {
      await fn();
      setNote({ text: okText, bad: false });
      await load();
    } catch (e) {
      setNote({ text: e.message, bad: true });
    }
  }

  const saveBus = () =>
    run(async () => {
      if (!form.number || !form.routeName) throw new Error("Enter the bus number and route name.");
      if (stops.length < 2) throw new Error("Tap the map to add at least 2 stops.");
      await api("/api/buses", { method: "POST", token, body: { ...form, stops } });
      setForm({ number: "", routeName: "", driver: "" });
      setStops([]);
    }, "Bus saved.");

  const removeBus = (b) =>
    window.confirm(`Delete ${b.number}?`) &&
    run(() => api(`/api/buses/${b._id}`, { method: "DELETE", token }), "Bus deleted.");

  const addDriver = () =>
    run(async () => {
      await api("/api/drivers", { method: "POST", token, body: driverForm });
      setDriverForm({ name: "", email: "", password: "" });
    }, "Driver added.");

  const addStop = ({ lat, lng }) => setStops((s) => [...s, { name: `Stop ${s.length + 1}`, lat, lng }]);
  const renameStop = (i, name) => setStops((s) => s.map((x, j) => (j === i ? { ...x, name } : x)));
  const removeStop = (i) => setStops((s) => s.filter((_, j) => j !== i));

  return (
    <main className="admin">
      {note.text && <p className={note.bad ? "note bad" : "note ok"}>{note.text}</p>}

      <section className="card">
        <h2>Add a bus</h2>
        <input placeholder="Bus number, for example BUS-02" value={form.number}
          onChange={(e) => setForm({ ...form, number: e.target.value })} />
        <input placeholder="Route name" value={form.routeName}
          onChange={(e) => setForm({ ...form, routeName: e.target.value })} />
        <select value={form.driver} onChange={(e) => setForm({ ...form, driver: e.target.value })}>
          <option value="">No driver yet</option>
          {drivers.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
        </select>

        <p className="sub">Tap the map to add stops in order. Stop 1 is the first pickup.</p>
        <MapContainer center={[28.6139, 77.209]} zoom={12} className="pick">
          <TileLayer attribution="© OpenStreetMap contributors" url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Picker onPick={addStop} />
          <Fly pos={here} />
          {stops.map((s, i) => <Marker key={i} position={[s.lat, s.lng]} icon={stopIcon} />)}
        </MapContainer>

        {stops.map((s, i) => (
          <div className="stoprow" key={i}>
            <input value={s.name} onChange={(e) => renameStop(i, e.target.value)} aria-label={`Stop ${i + 1} name`} />
            <button className="small" onClick={() => removeStop(i)}>Remove</button>
          </div>
        ))}
        <button className="primary" onClick={saveBus}>Save bus</button>
      </section>

      <section className="card">
        <h2>Buses</h2>
        {buses.length === 0 && <p className="sub">No buses yet. Add one above.</p>}
        {buses.map((b) => (
          <div className="busitem" key={b._id}>
            <div>
              <strong>{b.number}</strong>
              <div className="sub">
                {b.routeName} · {b.stops.length} stops · {drivers.find((d) => d._id === b.driver)?.name || "No driver"}
              </div>
            </div>
            <button className="small danger" onClick={() => removeBus(b)}>Delete</button>
          </div>
        ))}
      </section>

      <section className="card">
        <h2>Add a driver</h2>
        <input placeholder="Full name" value={driverForm.name}
          onChange={(e) => setDriverForm({ ...driverForm, name: e.target.value })} />
        <input placeholder="Email" type="email" value={driverForm.email}
          onChange={(e) => setDriverForm({ ...driverForm, email: e.target.value })} />
        <input placeholder="Password (6+ characters)" type="password" value={driverForm.password}
          onChange={(e) => setDriverForm({ ...driverForm, password: e.target.value })} />
        <button className="primary" onClick={addDriver}>Add driver</button>
      </section>
    </main>
  );
}
