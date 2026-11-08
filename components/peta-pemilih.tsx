"use client";

import { useEffect, useRef } from "react";

import "leaflet/dist/leaflet.css";
import type { Circle, Map as LeafletMap, Marker } from "leaflet";

type Leaflet = typeof import("leaflet");

/** Pusat awal bila titik belum diisi: Indonesia (zoom jauh). */
const PUSAT_AWAL: [number, number] = [-2.5, 118];

/**
 * Peta pemilih titik (Leaflet + tile OpenStreetMap, tanpa API key).
 * Klik peta atau geser pin untuk mengatur titik; lingkaran = radius scan.
 */
export function PetaPemilih({
  lat,
  long,
  radiusM,
  onPilih,
}: {
  lat: number | null;
  long: number | null;
  radiusM: number;
  onPilih: (lat: number, long: number) => void;
}) {
  const wadahRef = useRef<HTMLDivElement | null>(null);
  const petaRef = useRef<LeafletMap | null>(null);
  const leafletRef = useRef<Leaflet | null>(null);
  const pinRef = useRef<Marker | null>(null);
  const lingkaranRef = useRef<Circle | null>(null);
  const onPilihRef = useRef(onPilih);
  const awalRef = useRef({ lat, long, radiusM });

  useEffect(() => {
    onPilihRef.current = onPilih;
  }, [onPilih]);

  // Sinkronkan pin + lingkaran dengan nilai terbaru.
  const gambar = useRef((nilaiLat: number | null, nilaiLong: number | null, radius: number) => {
    const L = leafletRef.current;
    const peta = petaRef.current;
    if (!L || !peta) return;

    if (nilaiLat === null || nilaiLong === null) {
      pinRef.current?.remove();
      lingkaranRef.current?.remove();
      pinRef.current = null;
      lingkaranRef.current = null;
      return;
    }

    const posisi: [number, number] = [nilaiLat, nilaiLong];
    if (!pinRef.current) {
      const pin = L.marker(posisi, {
        draggable: true,
        keyboard: true,
        title: "Geser untuk memindahkan titik",
        icon: L.divIcon({
          className: "peta-pin",
          html: "<span></span>",
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        }),
      }).addTo(peta);
      pin.on("dragend", () => {
        const p = pin.getLatLng();
        onPilihRef.current(p.lat, p.lng);
      });
      pinRef.current = pin;
    } else {
      pinRef.current.setLatLng(posisi);
    }

    if (!lingkaranRef.current) {
      lingkaranRef.current = L.circle(posisi, {
        radius,
        color: "#1d4ed8",
        weight: 2,
        fillColor: "#3b82f6",
        fillOpacity: 0.15,
      }).addTo(peta);
    } else {
      lingkaranRef.current.setLatLng(posisi).setRadius(radius);
    }
  });

  useEffect(() => {
    let batal = false;
    let pengamat: ResizeObserver | null = null;

    void (async () => {
      const L = await import("leaflet");
      const wadah = wadahRef.current;
      if (batal || !wadah) return;
      leafletRef.current = L;

      const awal = awalRef.current;
      const punyaTitik = awal.lat !== null && awal.long !== null;
      const peta = L.map(wadah, {
        center: punyaTitik ? [awal.lat as number, awal.long as number] : PUSAT_AWAL,
        zoom: punyaTitik ? 18 : 5,
        scrollWheelZoom: true,
      });
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>',
      }).addTo(peta);
      peta.on("click", (e) => onPilihRef.current(e.latlng.lat, e.latlng.lng));
      petaRef.current = peta;

      gambar.current(awal.lat, awal.long, awal.radiusM);

      // Sheet geser masuk dari samping: ukur ulang setelah tata letak stabil.
      pengamat = new ResizeObserver(() => peta.invalidateSize());
      pengamat.observe(wadah);
    })();

    return () => {
      batal = true;
      pengamat?.disconnect();
      petaRef.current?.remove();
      petaRef.current = null;
      pinRef.current = null;
      lingkaranRef.current = null;
    };
  }, []);

  useEffect(() => {
    gambar.current(lat, long, radiusM);
    const peta = petaRef.current;
    if (peta && lat !== null && long !== null) {
      const zoom = Math.max(peta.getZoom(), 17);
      peta.setView([lat, long], zoom, { animate: true });
    }
  }, [lat, long, radiusM]);

  return (
    <div
      ref={wadahRef}
      role="application"
      aria-label="Peta pemilih titik checkpoint"
      data-testid="peta-pemilih"
      className="z-0 h-56 w-full overflow-hidden rounded-[var(--radius-sm)] border border-border bg-muted"
    />
  );
}
