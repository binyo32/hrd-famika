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

const AttendanceMap = ({ records = [] }) => {
  // ===== ALL POINTS FOR FIT =====
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
const PopupContent = ({ name, label, time, address }) => (
  <div style={{ minWidth: 220, lineHeight: 1.4 }}>
    <strong>{name}</strong>
    <hr style={{ margin: "6px 0" }} />

    <div style={{ fontSize: 12, fontWeight: 600 }}>
      {label} •{" "}
      {time
        ? new Date(time).toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "-"}
    </div>

    {address && (
      <div
        style={{
          fontSize: 11,
          marginTop: 4,
          color: "#555",
          whiteSpace: "normal",
        }}
      >
        {address}
      </div>
    )}
  </div>
);
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

          const hasCI = ci?.lat && ci?.lng;
          const hasCO = co?.lat && co?.lng;

          // ===== BUILD TIMELINE LINE =====
          const linePoints = [];

          if (hasCI) linePoints.push([ci.lat, ci.lng]);

          (r.attendance_location_logs || []).forEach((log) => {
            linePoints.push([log.latitude, log.longitude]);
          });

          if (hasCO) linePoints.push([co.lat, co.lng]);

          return (
            <div key={r.id}>
              {/* ===== POLYLINE TIMELINE ===== */}
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

              {/* ===== CHECK-IN ===== */}
              {hasCI && (
                <Marker position={[ci.lat, ci.lng]} icon={checkInIcon}>
                 <Popup>
  <PopupContent
    name={r.employee?.name}
    label="Check-in"
    time={r.check_in_time}
    address={ci.address}
  />
</Popup>
                </Marker>
              )}

              {/* ===== PROGRESS ===== */}
              {(r.attendance_location_logs || []).map((log, idx) => (
                <CircleMarker
                  key={idx}
                  center={[log.latitude, log.longitude]}
                  radius={6}
                  pathOptions={{ color: "#f59e0b" }}>
                  <Popup>
                    <strong>{r.employee?.name}</strong>
                    <br />
                    {log.activity || "Progres"}
                    <br />
                    {new Date(log.recorded_at).toLocaleTimeString("id-ID")}
                  </Popup>
                </CircleMarker>
              ))}

              {/* ===== CHECK-OUT ===== */}
              {hasCO && (
                <Marker position={[co.lat, co.lng]} icon={checkOutIcon}>
                  <Popup>
                    <strong>{r.employee?.name}</strong>
                    <br />
                    <span className="text-red-600">Check-out</span>
                    <br />
                    {r.check_out_time
                      ? new Date(r.check_out_time).toLocaleTimeString("id-ID")
                      : "-"}
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
