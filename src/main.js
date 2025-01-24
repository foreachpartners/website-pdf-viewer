import Analytics from 'analytics';
import googleAnalytics from '@analytics/google-analytics';

// Check environment variables only once
const LOGGING_ENABLED = import.meta.env.VITE_ENABLE_LOGGING === 'true';

// Initialize analytics only if GA ID is provided
let analytics = null;
try {
    const GA_ID = import.meta.env.VITE_GA_ID;
    
    if (!GA_ID || GA_ID.trim() === '') {
        throw new Error('No GA Measurement ID defined');
    }
    
    analytics = Analytics({
        debug: LOGGING_ENABLED,
        app: 'pdf-viewer',
        version: '1.0.0',
        plugins: [
            googleAnalytics({
                measurementIds: [GA_ID],
                debug: LOGGING_ENABLED
            })
        ]
    });

    if (LOGGING_ENABLED) {
        console.log('Analytics configuration:', {
            id: GA_ID,
            instance: analytics
        });
    }
} catch (error) {
    if (LOGGING_ENABLED) {
        console.warn('Failed to initialize Google Analytics:', {
            error,
            stack: error.stack,
            analyticsState: analytics
        });
    } else {
        console.warn('Failed to initialize Google Analytics:', error);
    }
}

if (LOGGING_ENABLED) {
    console.log('Environment:', {
        VITE_ENABLE_LOGGING: import.meta.env.VITE_ENABLE_LOGGING,
        VITE_BASE_PATH: import.meta.env.VITE_BASE_PATH,
        VITE_GA_ID: import.meta.env.VITE_GA_ID,
        MODE: import.meta.env.MODE
    });

    // Get parameters from URL
    const urlParams = new URLSearchParams(window.location.search);
    console.log('Request details:', {
        fullUrl: window.location.href,
        path: window.location.pathname,
        searchParams: Object.fromEntries(urlParams),
        hash: window.location.hash,
        referrer: document.referrer,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        documentTitle: document.title,
        screenResolution: {
            width: window.screen.width,
            height: window.screen.height
        },
        viewportSize: {
            width: window.innerWidth,
            height: window.innerHeight
        }
    });
}

import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import { PDFLinkService, PDFViewer, EventBus, PDFPageView, TextLayerBuilder, AnnotationLayerBuilder } from 'pdfjs-dist/web/pdf_viewer';
import 'pdfjs-dist/web/pdf_viewer.css';
import 'pdfjs-dist/build/pdf.worker.mjs';
import testPdf from './assets/test.pdf';

// Get parameters from URL
const urlParams = new URLSearchParams(window.location.search);
const isTest = urlParams.get('test') === 'true';
const docFromParams = urlParams.get('doc');

// Get path from URL after base path
const basePath = import.meta.env.VITE_BASE_PATH || '/';
const pathName = window.location.pathname;
const docFromPath = pathName.startsWith(basePath) 
    ? pathName.slice(basePath.length) 
    : pathName;

// Priority is given to the doc parameter if it exists
const pdfFile = isTest 
    ? testPdf 
    : docFromParams || (docFromPath || '');

// Control elements
const canvasContainer = document.getElementById('canvasContainer');
const loadingElement = document.getElementById('loading');
const errorElement = document.getElementById('error');

// Create download button (top)
const downloadButton = document.createElement('button');
downloadButton.textContent = 'Download PDF';
downloadButton.className = 'download-button';
downloadButton.style.display = 'none';

// Create bottom button
const bottomDownloadButton = downloadButton.cloneNode(true);

// Download handler for both buttons
[downloadButton, bottomDownloadButton].forEach(button => {
    button.addEventListener('click', () => {
        if (pdfFile) {
            const link = document.createElement('a');
            link.href = pdfFile;
            link.download = pdfFile.split('/').pop();
            link.click();
        }
    });
});

// Place buttons
canvasContainer.parentNode.insertBefore(downloadButton, canvasContainer);
canvasContainer.parentNode.insertBefore(bottomDownloadButton, canvasContainer.nextSibling);

// Create eventBus for component interaction
const eventBus = new EventBus();

// Create service for handling links
const linkService = new PDFLinkService({
    eventBus,
    externalLinkTarget: 2, // _blank
});

// Create factories for text layer and annotation layer
const textLayerFactory = {
    createTextLayerBuilder(textLayerDiv, pageIndex, viewport, enhanceTextSelection = false, eventBus) {
        return new TextLayerBuilder({
            textLayerDiv,
            pageIndex,
            viewport,
            enhanceTextSelection,
            eventBus,
        });
    },
};

const annotationLayerFactory = {
    createAnnotationLayerBuilder(pageDiv, pdfPage, annotationStorage = null, imageResourcesPath = "", renderForms = true, l10n = null, enableScripting = false, hasJSActionsPromise = null, mouseState = null) {
        return new AnnotationLayerBuilder({
            pageDiv,
            pdfPage,
            annotationStorage,
            imageResourcesPath,
            renderForms,
            linkService,
            downloadManager: null,
            l10n,
            enableScripting,
            hasJSActionsPromise,
            mouseState,
        });
    },
};

// Function to display error
function showError(message) {
    errorElement.textContent = message;
    errorElement.style.display = 'block';
    loadingElement.style.display = 'none';
}

// Function to render one page
async function renderPage(page, initialScale = 1) {
    try {
        const viewportWidth = window.innerWidth;
        const originalViewport = page.getViewport({ scale: 1 });
        
        const padding = 40;
        const containerWidth = Math.min(viewportWidth - padding, 1200);
        const scale = (containerWidth - padding) / originalViewport.width;
        const finalScale = Math.min(Math.max(scale, 0.8), 1.2);
        
        const viewport = page.getViewport({ scale: finalScale });

        // Create container for page
        const pageContainer = document.createElement('div');
        pageContainer.className = 'page'; // Use class page
        pageContainer.style.position = 'relative';
        pageContainer.style.width = '100%';
        pageContainer.style.margin = '0 auto';
        pageContainer.style.transform = 'none'; // Disable transformation

        // Create canvas
        const canvas = document.createElement('canvas');


        // Create and configure PDFPageView
        const pdfPageView = new PDFPageView({
            container: pageContainer,
            id: page.pageNumber,
            defaultViewport: viewport,
            eventBus: eventBus,
            annotationLayerFactory: annotationLayerFactory,
            linkService: linkService,
            renderInteractiveForms: true,
        });

        // Add observer for style changes
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                const target = mutation.target;
                if (target.style.transform) {
                    target.style.transform = 'none';
                }
                if (target.style.height) {
                    target.style.height = `${viewport.height}px`;
                }
            }
        });

        observer.observe(pageContainer, { 
            attributes: true, 
            attributeFilter: ['style'] 
        });

        await pdfPageView.setPdfPage(page);
        await pdfPageView.draw();

        canvasContainer.appendChild(pageContainer);
    } catch (error) {
        showError(`Error rendering page: ${error.message}`);
    }
}

// Function to log information about request
function logRequestInfo() {
    if (!import.meta.env.VITE_ENABLE_LOGGING) return;
    
    console.group('PDF Viewer Request Info');
    console.log('Full URL:', window.location.href);
    console.log('Path:', window.location.pathname);
    console.log('Search params:', Object.fromEntries(new URLSearchParams(window.location.search)));
    console.log('Referrer:', document.referrer);
    console.log('User Agent:', navigator.userAgent);
    console.log('Timestamp:', new Date().toISOString());
    console.groupEnd();
}

// Function to display PDF
async function renderPDF(url) {
    try {
        if (import.meta.env.VITE_ENABLE_LOGGING) {
            console.group('PDF Loading Details');
            console.log('Requested PDF URL:', url);
            console.log('Loading started at:', new Date().toISOString());
        }

        // Set page title based on filename
        const fileName = url.split('/').pop();
        const fileNameWithoutExt = fileName.replace('.pdf', '');
        document.title = fileNameWithoutExt || 'PDF Viewer';

        loadingElement.style.display = 'block';
        errorElement.style.display = 'none';
        canvasContainer.innerHTML = ''; // Clear container

        if (url.startsWith('http://') || url.startsWith('https://')) {
            throw new Error('Only relative paths are supported');
        }

        // Set worker configuration
        GlobalWorkerOptions.workerSrc = new URL(
            'pdfjs-dist/build/pdf.worker.mjs',
            import.meta.url
        ).toString();

        // Load file
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const pdfData = await response.arrayBuffer();

        // Log file loading attempt
        if (import.meta.env.VITE_ENABLE_LOGGING) {
            console.log('Fetching PDF file...');
            console.log('Response status:', response.status);
            console.log('Response headers:', Object.fromEntries(response.headers));
            console.log('PDF data size:', (pdfData.byteLength / 1024).toFixed(2), 'KB');
        }

        // Load PDF
        const loadingTask = getDocument({
            data: pdfData,
            verbosity: 1,
            cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
            cMapPacked: true,
        });

        const pdfDoc = await loadingTask.promise;
        
        // Show both download buttons after successful PDF loading
        downloadButton.style.display = 'block';
        bottomDownloadButton.style.display = 'block';

        // Send analytics event after successful PDF load
        sendGAEvent(url);

        // Initialize linkService
        linkService.setDocument(pdfDoc);
        linkService.setViewer({
            scrollPageIntoView: ({ pageNumber }) => {
                const pages = canvasContainer.getElementsByClassName('pdfViewer');
                if (pages[pageNumber - 1]) {
                    pages[pageNumber - 1].scrollIntoView();
                }
            }
        });

        // Render all pages
        for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
            const page = await pdfDoc.getPage(pageNum);
            await renderPage(page);
        }

        if (import.meta.env.VITE_ENABLE_LOGGING) {
            console.log('PDF successfully loaded');
            console.log('Number of pages:', pdfDoc.numPages);
            console.groupEnd();
        }

        loadingElement.style.display = 'none';
    } catch (error) {
        downloadButton.style.display = 'none'; // Hide button on error
        if (import.meta.env.VITE_ENABLE_LOGGING) {
            console.error('PDF Loading Error:', {
                message: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString()
            });
            console.groupEnd();
        }
        showError(`Error loading PDF: ${error.message}\nStack: ${error.stack}`);
    }
}

// Function to send analytics events
function sendGAEvent(pdfUrl) {
    if (!analytics) return;
    
    try {
        const documentName = pdfUrl.split('/').pop();
        
        const eventData = {
            documentUrl: pdfUrl,
            documentName: documentName,
            referrer: document.referrer,
            timestamp: new Date().toISOString()
        };

        if (LOGGING_ENABLED) {
            console.log('Sending GA event:', {
                type: 'view_document',
                data: eventData
            });
        }
        
        analytics.track('view_document', eventData);
    } catch (error) {
        console.warn('Failed to send analytics event:', error);
    }
}

// Check if file parameter exists and load PDF
if (pdfFile) {
    renderPDF(pdfFile);
} else {
    showError('No PDF file specified');
}
