# PDF Viewer Service

A web-based PDF viewer service built with PDF.js that allows viewing PDF documents through URL parameters. The service provides a convenient way to view PDF documents through a web interface.

## Usage

### Viewing PDFs

There are several ways to view PDF documents:

1. **URL-based document path (recommended)**
   ```
   https://foreachpartners.com/docview/docs/Sales-Partner-for-ForEach-Partners.pdf
   ```
   The viewer will automatically extract and load the document path from the URL. In this example, it will load `/docs/Sales-Partner-for-ForEach-Partners.pdf`.

2. **Direct document path with query parameter**
   ```
   https://foreachpartners.com/docview/?doc=/docs/Sales-Partner-for-ForEach-Partners.pdf
   ```
   Explicitly specify the path to the PDF document using the `doc` parameter.

3. **Test document**
   ```
   https://foreachpartners.com/docview/?test=true
   ```
   View a test PDF document to verify the viewer is working correctly.

### URL Patterns

The viewer supports various URL patterns:
- Direct path: `/docview/docs/example.pdf` → loads `/docs/example.pdf`
- Query parameter: `/docview/?doc=/docs/example.pdf` → loads `/docs/example.pdf`
- With subdirectories: `/docview/docs/subfolder/example.pdf` → loads `/docs/subfolder/example.pdf`

### URL Structure

- Base URL: `/docview/` (see [Environment Variables](#environment-variables) for configuration)
- Optional parameter `doc`: path to PDF document (e.g., `/docs/document.pdf`)
- Test mode: `?test=true`

Examples:

### Environment Variables

The service can be configured using the following environment variables:

- `VITE_BASE_PATH` - Base path for the application (default: `/docview`)
  ```
  VITE_BASE_PATH=/custom-path
  ```

- `VITE_ENABLE_LOGGING` - Enable detailed console logging (default: `false`)
  ```
  VITE_ENABLE_LOGGING=true
  ```

To configure these variables:

1. Create a `.env` file in the project root:
   ```
   VITE_BASE_PATH=/docview
   VITE_ENABLE_LOGGING=false
   ```

2. Or set them during build/start:
   ```bash
   VITE_BASE_PATH=/custom-path VITE_ENABLE_LOGGING=true pnpm build
   ```

## Overview

This service provides a web interface for viewing PDF documents. It uses:

- PDF.js for PDF rendering
- Vite for building and development
- Nginx for file serving and routing

## Features

- PDF viewing through URL parameters
- Clean and responsive interface
- Loading and error states handling
- Mobile-friendly design
- Support for multi-page PDFs
- Automatic page scaling

## Project Structure

```txt
project-root/
├── src/
│   ├── index.html
│   ├── main.js
│   └── styles.css
├── build/           # Generated after build
└── node_modules/    # Generated after install
```

## Setup

### 1. Application Setup

```bash
# Install dependencies
pnpm install

# Build for production
pnpm build
```

### 2. Nginx Configuration

Example nginx configuration:

```nginx
# PDF viewer configuration
location /docview {
    alias /opt/fep/website-pdf-viewer/build;
    index index.html;

    location ~* \.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|otf|ttc|mp4|webm|webp|ogg|json)$ {
        try_files $uri =404;
        access_log off;
        expires max;
    }

    try_files $uri /docview/index.html;
}

# PDF documents serving configuration
location /docs/ {
    autoindex off;
    add_header Content-Disposition inline;
    types {
        application/pdf pdf;
    }

    try_files $uri $uri/ =404;
}
```

## Development

```bash
# Start development server
pnpm start
```

## Browser Support

The viewer supports all modern browsers:

- Chrome (recommended)
- Firefox
- Safari
- Edge

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

ISC