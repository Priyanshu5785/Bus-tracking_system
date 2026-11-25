import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { api, SERVER } from "./api.js";

export default function Driver({ session }) {
  const [bus, setBus] = useState(null);
  const [sharing, setSharing] = useState(false);
  const [info, setInfo] = useState("");
  const socket = useRef(null);
  const watchId = useRef(null);
  const wakeLock = useRef(null);
  const lastSent = useRef(0);

  useEffect(() => {
    api("/api/buses", { token: session.token }).then((all) =>
      setBus(all.find((b) => b.driver === session.user.id) || null)
    );
    socket.current = io(SERVER, { auth: { token: session.token } });
    return () => {
      socket.current.disconnect();
      if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
    };
  }, []);

  async function start() {
    if (!navigator.geolocation) return setInfo("This browser can't share location.");
    socket.current.emit("trip:start", { busId: bus._id });
    try { wakeLock.current = await navigator.wakeLock?.request("screen"); } catch {}
    watchId.current = navigator.geolocation.watchPosition(
      ({ coords }) => {
        if (Date.now() - lastSent.current < 4000) return;
        lastSent.current = Date.now();
        socket.current.emit("location:update", {
          busId: bus._id, lat: coords.latitude, lng: coords.longitude, speed: coords.speed,
        });
        setInfo(`Accuracy about ${Math.round(coords.accuracy)} m`);
      },
      () => setInfo("Location is blocked. Allow location for this site in your browser settings."),
      { enableHighAccuracy: true, maximumAge: 0 }
    );
    setSharing(true);
  }

  function stop() {
    navigator.geolocation.clearWatch(watchId.current);
    watchId.current = null;
    wakeLock.current?.release();
    socket.current.emit("trip:end", { busId: bus._id });
    setSharing(false);
    setInfo("");
  }

  if (!bus) return <main className="panel"><p>No bus is assigned to you yet. Ask the admin.</p></main>;

  return (
    <main className="panel center">
      <h2>{bus.number}</h2>
      <p className="sub">{bus.routeName}</p>
      <button className={sharing ? "big stop" : "big go"} onClick={sharing ? stop : start}>
        {sharing ? "End trip" : "Start trip"}
      </button>
      <p className={sharing ? "live" : "sub"}>{sharing ? "Sharing live location" : "Not sharing"}</p>
      {info && <p className="sub">{info}</p>}
    </main>
  );
}
