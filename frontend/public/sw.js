/**
 * MediBot Service Worker
 * 
 * Provides offline support for the MediBot application.
 * Features:
 * - Cache static assets (HTML, CSS, JS, images)
 * - Cache API responses
 * - Offline fallback responses
 * - Network-first strategy for API calls
 * - Cache-first strategy for static assets
 */

const CACHE_NAME = 'medibot-v1';
const OFFLINE_CACHE = 'medibot-offline-v1';

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/chat',
  '/offline',
  '/manifest.json',
];

// API endpoints to cache
const API_CACHE_PATTERNS = [
  /\/api\/chat/,
  /\/api\/history/,
  /\/api\/session/,
];

/**
 * Install event - cache static assets
 */
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Caching static assets');
      return cache.addAll(STATIC_ASSETS.map(url => new Request(url, { cache: 'reload' })));
    }).catch((error) => {
      console.error('[ServiceWorker] Cache install failed:', error);
    })
  );
  
  // Activate immediately
  self.skipWaiting();
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== OFFLINE_CACHE) {
            console.log('[ServiceWorker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // Take control immediately
  return self.clients.claim();
});

/**
 * Fetch event - handle requests with caching strategies
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) {
    return;
  }
  
  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }
  
  // Handle static assets
  event.respondWith(handleStaticRequest(request));
});

/**
 * Handle API requests with network-first strategy
 */
async function handleApiRequest(request) {
  const url = new URL(request.url);
  
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[ServiceWorker] Network failed, trying cache:', url.pathname);
    
    // Try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline fallback for chat API
    if (url.pathname.includes('/api/chat')) {
      return createOfflineChatResponse(request);
    }
    
    // Return generic offline response
    return new Response(
      JSON.stringify({ error: 'Offline', message: 'No internet connection' }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * Handle static asset requests with cache-first strategy
 */
async function handleStaticRequest(request) {
  try {
    // Try cache first
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Try network
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[ServiceWorker] Failed to fetch:', request.url);
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      const offlineResponse = await caches.match('/offline');
      if (offlineResponse) {
        return offlineResponse;
      }
    }
    
    // Return error response
    return new Response('Offline', {
      status: 503,
      statusText: 'Service Unavailable',
    });
  }
}

/**
 * Create offline chat response with local fallback
 */
async function createOfflineChatResponse(request) {
  try {
    // Parse request body to get user message
    const requestClone = request.clone();
    let userMessage = '';
    
    try {
      const body = await requestClone.json();
      userMessage = body.message || '';
    } catch (e) {
      // If we can't parse the body, use a default message
      userMessage = '';
    }
    
    // Generate offline response based on message
    const offlineResponse = generateOfflineResponse(userMessage);
    
    // Return as streaming response to match online behavior
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        // Send response in chunks to simulate streaming
        const chunks = offlineResponse.split(' ');
        let index = 0;
        
        const sendChunk = () => {
          if (index < chunks.length) {
            const chunk = chunks[index] + ' ';
            controller.enqueue(encoder.encode(chunk));
            index++;
            setTimeout(sendChunk, 50); // Simulate typing delay
          } else {
            // Send final metadata
            const metadata = JSON.stringify({
              sessionId: 'offline-session',
              severity: 'mild',
              requiresAttention: false,
            });
            controller.enqueue(encoder.encode(`\n\n__METADATA__${metadata}`));
            controller.close();
          }
        };
        
        sendChunk();
      },
    });
    
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Offline-Mode': 'true',
      },
    });
  } catch (error) {
    console.error('[ServiceWorker] Error creating offline response:', error);
    
    // Return simple offline message
    return new Response(
      "I'm currently offline, but I can still provide basic guidance. Please note that my responses are limited without an internet connection. For urgent medical concerns, please contact a healthcare provider directly.",
      {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'X-Offline-Mode': 'true',
        },
      }
    );
  }
}

/**
 * Generate contextual offline response based on user message
 */
function generateOfflineResponse(userMessage) {
  const message = userMessage.toLowerCase();
  
  // Emergency keywords
  const emergencyKeywords = ['emergency', 'urgent', 'severe', 'chest pain', 'difficulty breathing', 'unconscious', 'bleeding heavily'];
  if (emergencyKeywords.some(keyword => message.includes(keyword))) {
    return "⚠️ This sounds like it could be an emergency. I'm currently offline and cannot provide proper assessment. Please call emergency services (911 in the US) or go to the nearest emergency room immediately. Do not wait for an internet connection.";
  }
  
  // Common symptoms with basic advice
  const symptomResponses = {
    'headache': "I'm currently offline, but for headaches, general advice includes: rest in a quiet, dark room; stay hydrated; consider over-the-counter pain relievers like acetaminophen or ibuprofen (if not contraindicated). If the headache is severe, sudden, or accompanied by other symptoms, seek medical attention when possible.",
    
    'fever': "I'm offline right now. For fever management: rest, stay hydrated, use over-the-counter fever reducers like acetaminophen or ibuprofen if appropriate. Monitor your temperature. Seek medical care if fever is very high (>103°F/39.4°C), lasts more than 3 days, or is accompanied by severe symptoms.",
    
    'cold': "I'm currently offline. For cold symptoms: rest, drink plenty of fluids, use a humidifier, consider over-the-counter cold medications. Most colds resolve in 7-10 days. Seek care if symptoms worsen or persist beyond 10 days.",
    
    'cough': "I'm offline at the moment. For coughs: stay hydrated, use honey (for adults and children over 1 year), rest, avoid irritants. If cough persists beyond 3 weeks, is accompanied by fever, or produces blood, seek medical attention.",
    
    'stomach': "I'm currently offline. For stomach issues: stay hydrated with small sips of water or electrolyte drinks, eat bland foods (BRAT diet: bananas, rice, applesauce, toast), rest. Seek care if you have severe pain, persistent vomiting, or signs of dehydration.",
    
    'pain': "I'm offline right now. For general pain: rest the affected area, apply ice or heat as appropriate, consider over-the-counter pain relievers if safe for you. If pain is severe, sudden, or doesn't improve, seek medical attention.",
  };
  
  // Check for symptom keywords
  for (const [keyword, response] of Object.entries(symptomResponses)) {
    if (message.includes(keyword)) {
      return response;
    }
  }
  
  // Medication questions
  if (message.includes('medication') || message.includes('medicine') || message.includes('drug')) {
    return "I'm currently offline and cannot access medication databases. For medication questions, please consult with a pharmacist or healthcare provider when you have internet access. Never start, stop, or change medications without professional guidance.";
  }
  
  // Default offline response
  return "I'm currently offline and have limited capabilities. I can provide only basic, general health information. For specific medical advice, diagnosis, or treatment recommendations, please consult with a healthcare provider. If you're experiencing severe symptoms or an emergency, seek immediate medical attention. I'll be able to provide more comprehensive assistance once you're back online.";
}

/**
 * Message event - handle messages from clients
 */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      })
    );
  }
});

console.log('[ServiceWorker] Loaded');
