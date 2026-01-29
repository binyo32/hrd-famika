import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  CircleMarker,
  useMap,
} from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

// ===== FIX ICON DEFAULT (VITE) =====
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// ===== ICONS =====
const checkInIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const checkOutIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// ===== AUTO FIT =====
const FitBounds = ({ points }) => {
  const map = useMap();
  if (!points.length) return null;

  map.fitBounds(L.latLngBounds(points), {
    padding: [80, 80],
    maxZoom: 16,
  });

  return null;
};

// ===== FLY TO BUTTON =====
const FlyToButton = ({ lat, lng }) => {
  const map = useMap();

  return (
    <button
      onClick={() => map.flyTo([lat, lng], 17, { duration: 0.6 })}
      style={{
        marginTop: 4,
        fontSize: 11,
        color: "#2563eb",
        textDecoration: "underline",
      }}>
      Lihat lokasi
    </button>
  );
};

// ===== POPUP TIMELINE =====
const TimelinePopup = ({ record }) => {
  const logs = record.attendance_location_logs || [];

  return (
    <div style={{ minWidth: 240, overflowY: "auto", maxHeight: 400 }}>
      <strong>{record.employee?.name}</strong>
      <hr style={{ margin: "6px 0" }} />

      {/* CHECK-IN */}
      {record.loc_checkin && (
        <div
          style={{
            fontSize: 12,
            padding: 6,
            backgroundColor: "#f3f4f6",
            borderRadius: 4,
          }}>
          <b style={{ color: "#08CB00" }}>Check-in</b> •{" "}
          {record.check_in_time
            ? new Date(record.check_in_time).toLocaleTimeString("id-ID", {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "-"}{" "}
          <br />
          {record.loc_checkin && (
            <div style={{ fontSize: 11, color: "#555" }}>
              {record.loc_checkin.address}
            </div>
          )}
          <FlyToButton
            lat={record.loc_checkin.lat}
            lng={record.loc_checkin.lng}
          />
        </div>
      )}
      {/* PROGRESS */}
      {logs.map((log, i) => (
        <div
          key={i}
          style={{
            fontSize: 12,
            marginTop: 6,
            padding: 6,
            backgroundColor: "#f3f4f6",
            borderRadius: 4,
          }}>
          <b>Update Lokasi Kerja</b> •{" "}
          {new Date(log.recorded_at).toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
          })}
          <div style={{ fontSize: 11, color: "#555" }}>
            <b>{log.activity || "Progres"}</b>
          </div>
          <div style={{ fontSize: 11, color: "#555" }}>
            {log.address || "-"}
          </div>
          <FlyToButton lat={log.latitude} lng={log.longitude} />
        </div>
      ))}

      {/* CHECK-OUT */}
      {record.loc_checkout && (
        <div
          style={{
            fontSize: 12,
            padding: 6,
            backgroundColor: "#f3f4f6",
            borderRadius: 4,
            marginTop: 6,
          }}>
          <b style={{ color: "#dc2626" }}>Check-out</b> •{" "} 

          {record.check_out_time
            ? new Date(record.check_out_time).toLocaleTimeString("id-ID", {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "-"}<br />
               {record.loc_checkout && (
            <div style={{ fontSize: 11, color: "#555" }}>
              {record.loc_checkout.address}
            </div>
          )}
          <FlyToButton
            lat={record.loc_checkout.lat}
            lng={record.loc_checkout.lng}
          />
        </div>
      )}
    </div>
  );
};

// ===== MAIN MAP =====
const AttendanceMap = ({ records = [] }) => {
  const allPoints = [];

  records.forEach((r) => {
    if (r.loc_checkin?.lat && r.loc_checkin?.lng) {
      allPoints.push([r.loc_checkin.lat, r.loc_checkin.lng]);
    }

    (r.attendance_location_logs || []).forEach((log) => {
      allPoints.push([log.latitude, log.longitude]);
    });

    if (r.loc_checkout?.lat && r.loc_checkout?.lng) {
      allPoints.push([r.loc_checkout.lat, r.loc_checkout.lng]);
    }
  });

  return (
    <MapContainer
      center={[-6.2, 106.816666]}
      zoom={5}
      scrollWheelZoom
      className="h-[520px] w-full rounded-xl border">
      <TileLayer
        url={
          document.documentElement.classList.contains("dark")
            ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        }
        attribution="© OpenStreetMap © CARTO"
      />

      <FitBounds points={allPoints} />

      <MarkerClusterGroup
        chunkedLoading
        maxClusterRadius={50}
        spiderfyOnMaxZoom
        showCoverageOnHover={false}>
        {records.map((r) => {
          const ci = r.loc_checkin;
          const co = r.loc_checkout;

          const linePoints = [];

          if (ci?.lat && ci?.lng) linePoints.push([ci.lat, ci.lng]);
          (r.attendance_location_logs || []).forEach((log) =>
            linePoints.push([log.latitude, log.longitude]),
          );
          if (co?.lat && co?.lng) linePoints.push([co.lat, co.lng]);

          return (
            <div key={r.id}>
              {/* POLYLINE */}
              {linePoints.length > 1 && (
                <Polyline
                  positions={linePoints}
                  pathOptions={{
                    color: "#7c3aed",
                    weight: 2,
                    opacity: 0.6,
                  }}
                />
              )}

              {/* CHECK-IN */}
              {ci?.lat && ci?.lng && (
                <Marker position={[ci.lat, ci.lng]} icon={checkInIcon}>
                  <Popup>
                    <TimelinePopup record={r} />
                  </Popup>
                </Marker>
              )}

              {/* PROGRESS */}
              {(r.attendance_location_logs || []).map((log, idx) => (
                <CircleMarker
                  key={idx}
                  center={[log.latitude, log.longitude]}
                  radius={6}
                  pathOptions={{ color: "#f59e0b" }}>
                  <Popup>
                    <TimelinePopup record={r} />
                  </Popup>
                </CircleMarker>
              ))}

              {/* CHECK-OUT */}
              {co?.lat && co?.lng && (
                <Marker position={[co.lat, co.lng]} icon={checkOutIcon}>
                  <Popup>
                    <TimelinePopup record={r} />
                  </Popup>
                </Marker>
              )}
            </div>
          );
        })}
      </MarkerClusterGroup>
    </MapContainer>
  );
};

export default AttendanceMap;
