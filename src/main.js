// Проверяем переменные окружения только один раз
const LOGGING_ENABLED = import.meta.env.VITE_ENABLE_LOGGING === 'true';

if (LOGGING_ENABLED) {
    console.log('Environment:', {
        VITE_ENABLE_LOGGING: import.meta.env.VITE_ENABLE_LOGGING,
        VITE_BASE_PATH: import.meta.env.VITE_BASE_PATH,
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
import 'pdfjs-dist/build/pdf.worker.mjs';
import testPdf from './assets/test.pdf';

// Get parameters from URL
const urlParams = new URLSearchParams(window.location.search);
const isTest = urlParams.get('test') === 'true';
const docFromParams = urlParams.get('doc');

// Получаем путь из URL после базового пути
const basePath = import.meta.env.VITE_BASE_PATH || '/';
const pathName = window.location.pathname;
const docFromPath = pathName.startsWith(basePath) 
    ? pathName.slice(basePath.length) 
    : pathName;

// Приоритет отдаём параметру doc, если он есть
const pdfFile = isTest 
    ? testPdf 
    : docFromParams || (docFromPath || '');

// Control elements
const canvasContainer = document.getElementById('canvasContainer');
const loadingElement = document.getElementById('loading');
const errorElement = document.getElementById('error');

// Function to display error
function showError(message) {
    errorElement.textContent = message;
    errorElement.style.display = 'block';
    loadingElement.style.display = 'none';
}

// Функция для отрисовки одной страницы
async function renderPage(page, scale = 1.5) {
    try {
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.marginBottom = '20px';

        const renderContext = {
            canvasContext: context,
            viewport: viewport
        };

        await page.render(renderContext);
        canvasContainer.appendChild(canvas);
    } catch (error) {
        showError(`Error rendering page: ${error.message}`);
    }
}

// Функция для логирования информации о запросе
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

// Функция для отображения PDF
async function renderPDF(url) {
    try {
        if (import.meta.env.VITE_ENABLE_LOGGING) {
            console.group('PDF Loading Details');
            console.log('Requested PDF URL:', url);
            console.log('Loading started at:', new Date().toISOString());
        }

        loadingElement.style.display = 'block';
        errorElement.style.display = 'none';
        canvasContainer.innerHTML = ''; // Очищаем контейнер

        if (url.startsWith('http://') || url.startsWith('https://')) {
            throw new Error('Only relative paths are supported');
        }

        // Настройка воркера
        GlobalWorkerOptions.workerSrc = new URL(
            'pdfjs-dist/build/pdf.worker.mjs',
            import.meta.url
        ).toString();

        // Загружаем файл
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const pdfData = await response.arrayBuffer();

        // Логируем попытку загрузки файла
        if (import.meta.env.VITE_ENABLE_LOGGING) {
            console.log('Fetching PDF file...');
            console.log('Response status:', response.status);
            console.log('Response headers:', Object.fromEntries(response.headers));
            console.log('PDF data size:', (pdfData.byteLength / 1024).toFixed(2), 'KB');
        }

        // Загружаем PDF
        const loadingTask = getDocument({
            data: pdfData,
            verbosity: 1,
            cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
            cMapPacked: true,
        });

        const pdfDoc = await loadingTask.promise;
        
        // Отрисовываем все страницы
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

// Check if file parameter exists and load PDF
if (pdfFile) {
    renderPDF(pdfFile);
} else {
    showError('No PDF file specified');
}
