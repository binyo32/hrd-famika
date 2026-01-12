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
  const points = [];

  records.forEach((r) => {
    if (r.loc_checkin?.lat && r.loc_checkin?.lng)
      points.push([r.loc_checkin.lat, r.loc_checkin.lng]);
    if (r.loc_checkout?.lat && r.loc_checkout?.lng)
      points.push([r.loc_checkout.lat, r.loc_checkout.lng]);
  });

  return (
    <MapContainer
      center={[-6.2, 106.816666]}
      zoom={5}
      scrollWheelZoom
      className="h-[520px] w-full rounded-xl border"
    >
      <TileLayer
        url={
          document.documentElement.classList.contains("dark")
            ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        }
        attribution="© OpenStreetMap © CARTO"
      />

      <FitBounds points={points} />

      {/* ===== CLUSTER GROUP ===== */}
      <MarkerClusterGroup
        chunkedLoading
        maxClusterRadius={50}
        spiderfyOnMaxZoom
        showCoverageOnHover={false}
      >
        {records.map((r) => {
          const ci = r.loc_checkin;
          const co = r.loc_checkout;

          const hasCI = ci?.lat && ci?.lng;
          const hasCO = co?.lat && co?.lng;

          return (
            <div key={r.id}>
              {/* GARIS */}
              {hasCI && hasCO && (
                <Polyline
                  positions={[
                    [ci.lat, ci.lng],
                    [co.lat, co.lng],
                  ]}
                  pathOptions={{
                    color: "#7c3aed",
                    weight: 2,
                    opacity: 0.6,
                  }}
                />
              )}

              {/* CHECK-IN */}
              {hasCI && (
                <Marker
                  position={[ci.lat, ci.lng]}
                  icon={checkInIcon}
                >
                  <Popup >
                    <strong>{r.employee?.name}</strong>
                    <br />
                    <span className="text-blue-600">
                      Check-in
                    </span>
                    <br />
                    {r.check_in_time
                      ? new Date(
                          r.check_in_time
                        ).toLocaleTimeString()
                      : "-"}
                  </Popup>
                </Marker>
              )}

              {/* CHECK-OUT */}
              {hasCO && (
                <Marker
                  position={[co.lat, co.lng]}
                  icon={checkOutIcon}
                >
                  <Popup>
                    <strong>{r.employee?.name}</strong>
                    <br />
                    <span className="text-red-600">
                      Check-out
                    </span>
                    <br />
                    {r.check_out_time
                      ? new Date(
                          r.check_out_time
                        ).toLocaleTimeString()
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
