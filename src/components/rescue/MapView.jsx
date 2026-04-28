import React, { useEffect, useMemo, useRef, useState } from 'react';
import { GoogleMap, HeatmapLayer, InfoWindowF, MarkerF, useJsApiLoader } from '@react-google-maps/api';

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

const center = {
  lat: 38.8951,
  lng: -77.0364,
};

export default function MapView({ incidents }) {
  const [selected, setSelected] = useState(null);
  const canvasRef = useRef(null);
  const stageRef = useRef(null);
  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const hasMapKey = Boolean(googleMapsApiKey && googleMapsApiKey !== 'YOUR_KEY_HERE');

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: googleMapsApiKey || '',
    libraries: ['visualization'],
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) return undefined;

    const context = canvas.getContext('2d');
    if (!context) return undefined;

    let animationFrameId;
    let angle = 0;

    const resizeCanvas = () => {
      const bounds = stage.getBoundingClientRect();
      canvas.width = bounds.width;
      canvas.height = bounds.height;
    };

    const draw = () => {
      context.clearRect(0, 0, canvas.width, canvas.height);
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const radius = Math.max(canvas.width, canvas.height);

      const sweepGradient = context.createConicGradient(angle, centerX, centerY);
      sweepGradient.addColorStop(0, 'rgba(59, 130, 246, 0.18)');
      sweepGradient.addColorStop(0.1, 'rgba(59, 130, 246, 0)');

      context.fillStyle = sweepGradient;
      context.beginPath();
      context.moveTo(centerX, centerY);
      context.arc(centerX, centerY, radius, angle - 0.22, angle);
      context.fill();

      angle += 0.015;
      animationFrameId = requestAnimationFrame(draw);
    };

    resizeCanvas();
    draw();
    window.addEventListener('resize', resizeCanvas);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isLoaded]);

  if (!hasMapKey || loadError) {
    return (
      <LocalProjectionMap
        incidents={incidents}
        selected={selected}
        onSelect={setSelected}
      />
    );
  }

  if (!isLoaded) {
    return <div style={S.loading}>[ INITIALIZING_MAP_SDK ]</div>;
  }

  return (
    <div ref={stageRef} style={S.mapWrapper} className="glass-panel">
      <div style={S.technicalHeader}>
        <span>GRID: WGS-84</span>
        <span style={{ marginLeft: 'auto' }}>MAP_LAYER: SATELLITE_HYBRID</span>
      </div>

      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={13}
        options={{
          styles: darkMapStyle,
          disableDefaultUI: true,
          mapTypeId: 'satellite',
        }}
      >
        {window.google?.maps?.visualization && (
          <HeatmapLayer
            data={incidents.map((incident, index) => {
              const point = getIncidentCoordinates(incident, index);
              return {
                location: new window.google.maps.LatLng(point.lat, point.lng),
                weight: incident.severity === 'critical' ? 3 : 1,
              };
            })}
            options={{
              radius: 40,
              opacity: 0.8,
              gradient: [
                'rgba(0, 255, 255, 0)',
                'rgba(0, 255, 255, 1)',
                'rgba(0, 191, 255, 1)',
                'rgba(0, 127, 255, 1)',
                'rgba(0, 63, 255, 1)',
                'rgba(0, 0, 255, 1)',
                'rgba(0, 0, 223, 1)',
                'rgba(0, 0, 191, 1)',
                'rgba(0, 0, 159, 1)',
                'rgba(0, 0, 127, 1)',
                'rgba(63, 0, 91, 1)',
                'rgba(127, 0, 63, 1)',
                'rgba(191, 0, 31, 1)',
                'rgba(255, 0, 0, 1)',
              ],
            }}
          />
        )}

        {incidents.map((incident, index) => {
          const point = getIncidentCoordinates(incident, index);

          return (
            <MarkerF
              key={incident.id}
              position={{ lat: point.lat, lng: point.lng }}
              icon={{
                path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z',
                fillColor: incident.severity === 'critical' ? '#f43f5e' : '#3b82f6',
                fillOpacity: 1,
                strokeWeight: 2,
                strokeColor: '#ffffff',
                scale: 1.5,
              }}
              onClick={() => setSelected(incident)}
            />
          );
        })}

        {selected && (
          <InfoWindowF
            position={getIncidentCoordinates(selected, 0)}
            onCloseClick={() => setSelected(null)}
          >
            <div style={S.infoWindow}>
              <div style={S.infoTitle}>{selected.id}</div>
              <div style={S.infoSeverity}>{selected.severity.toUpperCase()}</div>
              <div style={S.infoData}>
                {selected.category} | {selected.people_count ?? selected.peopleCount ?? selected.data?.people_count} PERS
              </div>
            </div>
          </InfoWindowF>
        )}
      </GoogleMap>

      <canvas ref={canvasRef} style={S.overlayCanvas} />

      <div style={S.overlay}>
        <div className="technical-data" style={S.activeCount}>
          ACTIVE_MESH_NODES: {incidents.length.toString().padStart(3, '0')}
        </div>
      </div>
    </div>
  );
}

function LocalProjectionMap({ incidents, selected, onSelect }) {
  const projected = useMemo(() => projectIncidents(incidents), [incidents]);
  const activeIncident = selected
    ? projected.find((incident) => incident.id === selected.id) || projected[0]
    : projected[0];

  return (
    <div style={S.mapWrapper} className="glass-panel">
      <div style={S.technicalHeader}>
        <span>GRID: RELIEF_PROJECTION</span>
        <span style={{ marginLeft: 'auto' }}>MAP_LAYER: LOCAL_TACTICAL_FIELD</span>
      </div>

      <div style={S.fallbackStage}>
        <div style={S.fallbackGrid} />
        <div style={S.fallbackRingLarge} />
        <div style={S.fallbackRingMedium} />
        <div style={S.fallbackRingSmall} />
        <div style={S.fallbackAxisHorizontal} />
        <div style={S.fallbackAxisVertical} />

        <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={S.fallbackRouteLayer}>
          {projected.length > 1 && (
            <polyline
              points={projected.map((incident) => `${incident.x} ${incident.y}`).join(' ')}
              fill="none"
              stroke="rgba(59, 130, 246, 0.18)"
              strokeWidth="0.35"
              strokeDasharray="1.4 1.6"
            />
          )}
        </svg>

        {projected.length === 0 ? (
          <div style={S.fallbackEmpty}>[ COORDINATE_LOCK_PENDING ]</div>
        ) : (
          projected.map((incident) => {
            const isCritical = incident.severity === 'critical';
            const isSelected = activeIncident?.id === incident.id;

            return (
              <button
                key={incident.id}
                type="button"
                onClick={() => onSelect(incident)}
                style={{
                  ...S.fallbackMarkerButton,
                  left: `${incident.x}%`,
                  top: `${incident.y}%`,
                }}
              >
                <span
                  style={{
                    ...S.fallbackMarker,
                    background: isCritical ? '#f43f5e' : '#3b82f6',
                    boxShadow: `0 0 16px ${isCritical ? '#f43f5e' : '#3b82f6'}`,
                    transform: isSelected ? 'scale(1.28)' : 'scale(1)',
                  }}
                />
                {isSelected && (
                  <span style={S.fallbackMarkerLabel}>
                    {incident.id}
                  </span>
                )}
              </button>
            );
          })
        )}

        <div style={S.fallbackCornerTag}>
          ACTIVE_MESH_NODES: {incidents.length.toString().padStart(3, '0')}
        </div>

        {activeIncident && (
          <div style={S.fallbackDetail}>
            <div style={S.fallbackDetailTitle}>{activeIncident.id}</div>
            <div style={S.fallbackDetailRow}>
              <span>SEVERITY</span>
              <strong style={{ color: activeIncident.severity === 'critical' ? '#f43f5e' : '#60a5fa' }}>
                {activeIncident.severity.toUpperCase()}
              </strong>
            </div>
            <div style={S.fallbackDetailRow}>
              <span>CATEGORY</span>
              <strong>{activeIncident.category}</strong>
            </div>
            <div style={S.fallbackDetailRow}>
              <span>COORD</span>
              <strong>{activeIncident.lat.toFixed(4)}, {activeIncident.lng.toFixed(4)}</strong>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function getIncidentCoordinates(incident, index) {
  const lat = Number(incident.latitude ?? incident.lat);
  const lng = Number(incident.longitude ?? incident.lng);

  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return { lat, lng };
  }

  const angle = (index / 8) * Math.PI * 2;
  return {
    lat: center.lat + Math.sin(angle) * 0.04,
    lng: center.lng + Math.cos(angle) * 0.05,
  };
}

function projectIncidents(incidents) {
  if (!incidents.length) return [];

  const points = incidents.slice(0, 18).map((incident, index) => ({
    ...incident,
    ...getIncidentCoordinates(incident, index),
  }));

  const lats = points.map((incident) => incident.lat);
  const lngs = points.map((incident) => incident.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  const latSpan = Math.max(maxLat - minLat, 0.04);
  const lngSpan = Math.max(maxLng - minLng, 0.04);

  return points.map((incident, index) => {
    const x = 12 + ((incident.lng - minLng) / lngSpan) * 76;
    const y = 14 + ((maxLat - incident.lat) / latSpan) * 70;
    const jitterX = ((index % 3) - 1) * 1.4;
    const jitterY = (((index + 1) % 3) - 1) * 1.2;

    return {
      ...incident,
      x: clamp(x + jitterX, 8, 92),
      y: clamp(y + jitterY, 10, 88),
    };
  });
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#212121' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#212121' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#757575' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#000000' }] },
];

const S = {
  mapWrapper: {
    width: '100%',
    height: '100%',
    background: '#05070a',
    borderRadius: 12,
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  technicalHeader: {
    display: 'flex',
    padding: '8px 12px',
    fontSize: '0.5rem',
    color: '#475569',
    fontWeight: 900,
    fontFamily: '"JetBrains Mono"',
    borderBottom: '1px solid rgba(255,255,255,0.03)',
    zIndex: 5,
    background: '#05070a',
  },
  overlayCanvas: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    zIndex: 2,
  },
  loading: {
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.6rem',
    color: '#3b82f6',
    fontWeight: 900,
    letterSpacing: 2,
  },
  fallbackStage: {
    position: 'relative',
    flex: 1,
    overflow: 'hidden',
    background: 'radial-gradient(circle at center, rgba(59, 130, 246, 0.12), rgba(2, 6, 23, 0.98) 58%)',
  },
  fallbackGrid: {
    position: 'absolute',
    inset: 0,
    backgroundImage: 'linear-gradient(rgba(59,130,246,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.05) 1px, transparent 1px)',
    backgroundSize: '44px 44px',
    opacity: 0.48,
  },
  fallbackRingLarge: {
    position: 'absolute',
    inset: '12% 10%',
    borderRadius: '50%',
    border: '1px solid rgba(59, 130, 246, 0.12)',
  },
  fallbackRingMedium: {
    position: 'absolute',
    inset: '20% 22%',
    borderRadius: '50%',
    border: '1px solid rgba(59, 130, 246, 0.16)',
  },
  fallbackRingSmall: {
    position: 'absolute',
    inset: '34% 36%',
    borderRadius: '50%',
    border: '1px solid rgba(59, 130, 246, 0.22)',
  },
  fallbackAxisHorizontal: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    borderTop: '1px solid rgba(59, 130, 246, 0.08)',
  },
  fallbackAxisVertical: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '50%',
    borderLeft: '1px solid rgba(59, 130, 246, 0.08)',
  },
  fallbackRouteLayer: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
  },
  fallbackMarkerButton: {
    position: 'absolute',
    transform: 'translate(-50%, -50%)',
    background: 'transparent',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
  },
  fallbackMarker: {
    display: 'block',
    width: 12,
    height: 12,
    borderRadius: '50%',
    border: '2px solid rgba(255,255,255,0.92)',
    transition: 'transform 0.2s ease',
  },
  fallbackMarkerLabel: {
    position: 'absolute',
    top: -22,
    left: 12,
    whiteSpace: 'nowrap',
    fontSize: '0.5rem',
    fontWeight: 900,
    color: '#dbeafe',
    letterSpacing: '0.12em',
    fontFamily: '"JetBrains Mono"',
  },
  fallbackCornerTag: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    fontSize: '0.6rem',
    color: '#3b82f6',
    fontWeight: 800,
    letterSpacing: '0.08em',
  },
  fallbackDetail: {
    position: 'absolute',
    left: 16,
    bottom: 16,
    width: 240,
    padding: '12px 14px',
    background: 'rgba(2, 6, 23, 0.84)',
    border: '1px solid rgba(59, 130, 246, 0.14)',
    borderRadius: 10,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  fallbackDetailTitle: {
    fontSize: '0.66rem',
    color: '#fff',
    fontWeight: 900,
    letterSpacing: '0.1em',
  },
  fallbackDetailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    fontSize: '0.55rem',
    color: '#94a3b8',
  },
  fallbackEmpty: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#1e3a8a',
    fontSize: '0.65rem',
    fontWeight: 900,
    letterSpacing: '0.14em',
  },
  overlay: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    pointerEvents: 'none',
    zIndex: 10,
  },
  activeCount: {
    fontSize: '0.6rem',
    color: '#3b82f6',
    fontWeight: 800,
    letterSpacing: '0.05em',
  },
  infoWindow: { color: '#000', padding: 8, minWidth: 120 },
  infoTitle: { fontWeight: 900, fontSize: '0.7rem' },
  infoSeverity: { color: '#f43f5e', fontSize: '0.5rem', fontWeight: 900 },
  infoData: { fontSize: '0.5rem', marginTop: 4 },
};
