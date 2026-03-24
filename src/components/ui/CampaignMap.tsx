import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { motion } from 'framer-motion';
import { fetchMapData, type MapPoint, type MapPeriod } from '../../services/mapService';
import { useCampaign } from '../../context/CampaignContext';
import { Map as MapIcon, History, Zap } from 'lucide-react';

// Correção segura global para o ícone padrão do Leaflet no React
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Líderes com ícone dourado/amarelo para destaque visual
const leaderIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export function CampaignMap() {
  const { activeCampaign } = useCampaign();
  const campaignId = activeCampaign?.id || '';
  const [period, setPeriod] = useState<MapPeriod>('current');
  const [points, setPoints] = useState<MapPoint[]>([]);
  const [geoData, setGeoData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Carrega malha do RS e os marcadores via MapService (Firestore/Mock API)
  useEffect(() => {
    let mounted = true;

    async function loadData() {
      setLoading(true);
      try {
        const [pts, rsGeo] = await Promise.all([
          fetchMapData(campaignId, period),
          fetch('/rs-mun.json').then(r => r.json()).catch(() => null)
        ]);
        if (mounted) {
          setPoints(pts);
          if (rsGeo) setGeoData(rsGeo);
        }
      } catch (e) {
        console.error("Erro mapeando:", e);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadData();
    return () => { mounted = false; };
  }, [campaignId, period]);

  const mapCenter: [number, number] = [-29.5, -53.5]; // Centro exato do RS
  const zoomLevel = 6;

  // Estilo Dark Mode da malha
  const geoJsonStyle = {
    fillColor: '#1e293b',
    weight: 1,
    opacity: 0.3,
    color: '#334155',
    fillOpacity: 0.6,
  };

  // Cores institucionais do RS
  const getHeatmapColor = (weight: number) => {
    if (weight > 0.8) return '#ef4444'; // Vermelho RS
    if (weight > 0.5) return '#f59e0b'; // Amarelo RS
    return '#10b981';                   // Verde RS
  };

  return (
    <div className="flex flex-col gap-4 w-full h-[500px] mt-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2 m-0">
            <MapIcon size={20} className="text-indigo-400" />
            Vigilância Geo-Estratégica
          </h2>
          <p className="text-sm text-slate-400 m-0">Monitoramento espacial de engajamento do eleitorado e polos de liderança</p>
        </div>

        <div className="flex bg-slate-800/50 p-1 rounded-lg border border-white/5">
          <button
            onClick={() => setPeriod('current')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              period === 'current' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-white/5'
            }`}
          >
            <Zap size={16} /> Atual (2026)
          </button>
          <button
            onClick={() => setPeriod('history')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              period === 'history' ? 'bg-amber-600 text-white shadow-lg' : 'text-slate-400 hover:bg-white/5'
            }`}
          >
            <History size={16} /> Histórico (22/24)
          </button>
        </div>
      </div>

      <div className="relative flex-1 rounded-xl overflow-hidden glass-card border border-white/10" style={{ zIndex: 0 }}>
        {loading && (
          <div className="absolute inset-0 bg-slate-950/80 z-[1000] flex items-center justify-center backdrop-blur-sm">
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} className="w-8 h-8 flex border-4 border-indigo-500/30 border-t-indigo-500 rounded-full" />
          </div>
        )}

        {/* Leaflet Core */}
        <MapContainer center={mapCenter} zoom={zoomLevel} scrollWheelZoom={false} style={{ height: '100%', width: '100%', background: '#0a0f1e' }}>
          {/* CartoDB Dark Matter */}
          <TileLayer
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />

          {geoData && <GeoJSON data={geoData} style={() => geoJsonStyle} />}

          {/* Camada de Calor Simulada (Blur visual) */}
          {points.filter(p => p.type === 'engagement').map(p => {
             const isNeighborhood = activeCampaign?.neighborhood?.includes(p.city);
             return (
               <CircleMarker
                 key={p.id}
                 center={[p.lat, p.lng]}
                 radius={(p.weight || 0.5) * (isNeighborhood ? 60 : 45)}
                 pathOptions={{
                   fillColor: getHeatmapColor(p.weight || 0.5),
                   fillOpacity: isNeighborhood ? 0.5 : 0.35,
                   color: isNeighborhood ? '#fff' : getHeatmapColor(p.weight || 0.5),
                   weight: isNeighborhood ? 2 : 1,
                   dashArray: isNeighborhood ? '5, 5' : undefined
                 }}
               >
                 <Popup className="!bg-slate-900 border border-slate-700 text-white rounded-lg">
                   <div className="font-semibold text-slate-100 flex items-center gap-2">
                     {p.city}
                     {isNeighborhood && <span className="bg-amber-500/20 text-amber-400 text-[9px] px-1.5 py-0.5 rounded border border-amber-500/30">FOCO ESTRATÉGICO</span>}
                   </div>
                   <div className="text-sm text-indigo-300">Intenção / Engajamento: {Math.round((p.weight||0)*100)}%</div>
                 </Popup>
               </CircleMarker>
             );
          })}

          {/* Camada tática - Lideranças Activas */}
          {points.filter(p => p.type === 'leader').map(p => (
            <Marker key={p.id} position={[p.lat, p.lng]} icon={leaderIcon}>
              <Popup>
                <div className="font-bold text-amber-600">{p.name}</div>
                <div className="text-sm text-slate-700">{p.city}</div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
