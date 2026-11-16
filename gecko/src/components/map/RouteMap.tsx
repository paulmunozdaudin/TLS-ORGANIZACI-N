import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Polyline } from 'react-native-maps';

import { colors } from '@/theme/tokens';
import type { RouteMapProps } from './types';

/** Estilo oscuro para Google Maps (Android). En iOS, Apple Maps usa `userInterfaceStyle="dark"`. */
const DARK_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#121412' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#6b736b' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0a0b0a' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#262a26' }] },
  { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0b1a1f' }] },
  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#141a12' }] },
];

export function RouteMap({ points, live, style }: RouteMapProps) {
  const map = useRef<MapView>(null);
  const coords = points.map((p) => ({ latitude: p.lat, longitude: p.lon }));
  const last = coords[coords.length - 1];
  const lastKey = last ? `${last.latitude},${last.longitude}` : '';

  useEffect(() => {
    if (!last) return;
    if (live) {
      map.current?.animateCamera({ center: last, zoom: 16.5 }, { duration: 600 });
    } else if (coords.length > 1) {
      map.current?.fitToCoordinates(coords, {
        edgePadding: { top: 48, right: 48, bottom: 48, left: 48 },
        animated: false,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastKey, live]);

  return (
    <View style={[styles.fill, style]}>
      <MapView
        ref={map}
        style={StyleSheet.absoluteFill}
        userInterfaceStyle="dark"
        customMapStyle={DARK_STYLE}
        showsUserLocation={live}
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
        pitchEnabled={false}
        rotateEnabled={false}
        scrollEnabled={!live}
        initialRegion={
          last ? { ...last, latitudeDelta: 0.008, longitudeDelta: 0.008 } : undefined
        }
        onMapReady={() => {
          if (!live && coords.length > 1) {
            map.current?.fitToCoordinates(coords, {
              edgePadding: { top: 48, right: 48, bottom: 48, left: 48 },
              animated: false,
            });
          }
        }}
      >
        {coords.length > 1 ? (
          <Polyline coordinates={coords} strokeColor={colors.lime} strokeWidth={5} lineCap="round" lineJoin="round" />
        ) : null}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#0F110F' },
});
