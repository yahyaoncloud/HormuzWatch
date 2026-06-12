import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
    stages: [
        { duration: '10s', target: 50 },  // Ramp up to 50 users
        { duration: '30s', target: 50 },  // Stay at 50 users for 30s
        { duration: '10s', target: 100 }, // Ramp up to 100 users
        { duration: '30s', target: 100 }, // Stay at 100 users for 30s
        { duration: '10s', target: 0 },   // Ramp down to 0 users
    ],
    thresholds: {
        http_req_duration: ['p(95)<500'], // 95% of requests must complete below 500ms
        http_req_failed: ['rate<0.01'],   // Error rate must be less than 1%
    },
};

const BASE_URL = 'http://localhost:8080';

export default function () {
    // 1. Test Heatmap endpoint (Heavy read)
    const heatmapRes = http.get(`${BASE_URL}/heatmap`);
    check(heatmapRes, {
        'heatmap status is 200': (r) => r.status === 200,
        'heatmap returns array': (r) => {
            try {
                const body = JSON.parse(r.body);
                return Array.isArray(body);
            } catch (e) {
                return false;
            }
        },
    });

    // 2. Test Analyze endpoint (Heavy write + ML logic if mocked)
    const payload = JSON.stringify({
        trackId: `TEST-${__VU}-${__ITER}`,
        assetName: 'K6-Test-Vessel',
        timestamp: new Date().toISOString(),
        lat: 25.0 + (Math.random() * 2),
        lon: 55.0 + (Math.random() * 2),
        speed: 15.5,
        previousSpeed: 15.0,
        heading: 90.0,
        courseDelta: 0.5,
        aisAgeMinutes: 0,
        hotZoneDistanceNm: 5.0
    });

    const params = {
        headers: {
            'Content-Type': 'application/json',
        },
    };

    const analyzeRes = http.post(`${BASE_URL}/analyze`, payload, params);
    check(analyzeRes, {
        'analyze status is 200': (r) => r.status === 200,
        'analyze returns score': (r) => r.body.includes('score'),
    });

    sleep(1);
}
