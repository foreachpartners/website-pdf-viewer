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
import { PDFLinkService, PDFViewer, EventBus, PDFPageView, TextLayerBuilder, AnnotationLayerBuilder } from 'pdfjs-dist/web/pdf_viewer';
import 'pdfjs-dist/web/pdf_viewer.css';
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

// Создаем кнопку скачивания (верхнюю)
const downloadButton = document.createElement('button');
downloadButton.textContent = 'Download PDF';
downloadButton.className = 'download-button';
downloadButton.style.display = 'none';

// Создаем нижнюю кнопку
const bottomDownloadButton = downloadButton.cloneNode(true);

// Обработчик для скачивания для обеих кнопок
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

// Размещаем кнопки
canvasContainer.parentNode.insertBefore(downloadButton, canvasContainer);
canvasContainer.parentNode.insertBefore(bottomDownloadButton, canvasContainer.nextSibling);

// Создаем eventBus для взаимодействия компонентов
const eventBus = new EventBus();

// Создаем сервис для обработки ссылок
const linkService = new PDFLinkService({
    eventBus,
    externalLinkTarget: 2, // _blank
});

// Создаем фабрики для текстового слоя и слоя аннотаций
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

// Функция для отрисовки одной страницы
async function renderPage(page, initialScale = 1) {
    try {
        const viewportWidth = window.innerWidth;
        const originalViewport = page.getViewport({ scale: 1 });
        
        const padding = 40;
        const containerWidth = Math.min(viewportWidth - padding, 1200);
        const scale = (containerWidth - padding) / originalViewport.width;
        const finalScale = Math.min(Math.max(scale, 0.8), 1.2);
        
        const viewport = page.getViewport({ scale: finalScale });

        // Создаем контейнер для страницы
        const pageContainer = document.createElement('div');
        pageContainer.className = 'page'; // Используем класс page
        pageContainer.style.position = 'relative';
        pageContainer.style.width = '100%';
        pageContainer.style.margin = '0 auto';
        pageContainer.style.transform = 'none'; // Отключаем трансформацию

        // Создаем canvas
        const canvas = document.createElement('canvas');


        // Создаем и настраиваем PDFPageView
        const pdfPageView = new PDFPageView({
            container: pageContainer,
            id: page.pageNumber,
            defaultViewport: viewport,
            eventBus: eventBus,
            annotationLayerFactory: annotationLayerFactory,
            linkService: linkService,
            renderInteractiveForms: true,
        });

        // Добавляем наблюдатель за изменениями стилей
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
        
        // Показываем обе кнопки скачивания после успешной загрузки PDF
        downloadButton.style.display = 'block';
        bottomDownloadButton.style.display = 'block';

        // Инициализируем linkService
        linkService.setDocument(pdfDoc);
        linkService.setViewer({
            scrollPageIntoView: ({ pageNumber }) => {
                const pages = canvasContainer.getElementsByClassName('pdfViewer');
                if (pages[pageNumber - 1]) {
                    pages[pageNumber - 1].scrollIntoView();
                }
            }
        });

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
        downloadButton.style.display = 'none'; // Скрываем кнопку при ошибке
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
