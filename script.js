/* This is the JavaScript extracted from your original HTML file */
document.addEventListener('DOMContentLoaded', function() {
    const pdfInput = document.getElementById('pdfInput');
    const browseBtn = document.getElementById('browseBtn');
    const uploadArea = document.getElementById('uploadArea');
    const fileInfo = document.getElementById('fileInfo');
    const fileName = document.getElementById('fileName');
    const pageCount = document.getElementById('pageCount');
    const startPage = document.getElementById('startPage');
    const endPage = document.getElementById('endPage');
    const splitBtn = document.getElementById('splitBtn');
    const loading = document.getElementById('loading');
    const successMessage = document.getElementById('successMessage');

    // === NEW: Notification Modal Logic ===
    const notification = document.getElementById('notification');
    const notificationMessage = document.getElementById('notificationMessage');
    const notificationClose = document.getElementById('notificationClose');

    function showNotification(message) {
        notificationMessage.textContent = message;
        notification.classList.add('active');
    }

    notificationClose.addEventListener('click', function() {
        notification.classList.remove('active');
    });
    // ======================================
    
    // Browse button click
    browseBtn.addEventListener('click', function() {
        pdfInput.click();
    });
    
    // File input change
    pdfInput.addEventListener('change', function(e) {
        if (e.target.files.length > 0) {
            handleFileSelection(e.target.files[0]);
        }
    });
    
    // Drag and drop functionality
    uploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        uploadArea.style.borderColor = 'var(--primary)';
        uploadArea.style.backgroundColor = '#f0f4ff';
    });
    
    uploadArea.addEventListener('dragleave', function() {
        uploadArea.style.borderColor = '#d1d5db';
        uploadArea.style.backgroundColor = '#f9fafb';
    });
    
    uploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        uploadArea.style.borderColor = '#d1d5db';
        uploadArea.style.backgroundColor = '#f9fafb';
        
        if (e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            if (file.type === 'application/pdf') {
                pdfInput.files = e.dataTransfer.files; // Set the file input
                handleFileSelection(file);
            } else {
                showNotification('Please upload a PDF file.'); // Replaced alert
            }
        }
    });
    
    // Handle file selection
    async function handleFileSelection(file) {
        fileName.textContent = file.name;
        
        // Read the PDF to get page count
        const fileReader = new FileReader();
        fileReader.onload = async function() {
            try {
                // We need to wait for pdf-lib to be loaded
                if (typeof PDFLib === 'undefined') {
                    console.error("pdf-lib.js is not loaded yet.");
                    showNotification("File library is still loading. Please try again in a second.");
                    return;
                }
                const pdfDoc = await PDFLib.PDFDocument.load(fileReader.result);
                const pages = pdfDoc.getPageCount();
                pageCount.textContent = pages;
                
                // Set end page to total pages by default
                endPage.value = pages;
                endPage.max = pages;
                startPage.max = pages;
                startPage.value = 1; // Reset start page
                
                fileInfo.classList.add('active');
            } catch (error) {
                console.error('Error loading PDF:', error);
                showNotification('Error reading PDF file. Please make sure it\'s a valid PDF.'); // Replaced alert
            }
        };
        fileReader.readAsArrayBuffer(file);
    }
    
    // Update end page when start page changes
    startPage.addEventListener('change', function() {
        const startVal = parseInt(startPage.value);
        const endVal = parseInt(endPage.value);
        const maxVal = parseInt(startPage.max);

        if (startVal < 1) startPage.value = 1;
        if (startVal > maxVal) startPage.value = maxVal;

        if (parseInt(startPage.value) > parseInt(endPage.value)) {
            endPage.value = startPage.value;
        }
    });

    // Update start page when end page changes
    endPage.addEventListener('change', function() {
        const startVal = parseInt(startPage.value);
        const endVal = parseInt(endPage.value);
        const maxVal = parseInt(endPage.max);

        if (endVal > maxVal) endPage.value = maxVal;
        if (endVal < 1) endPage.value = 1;

        if (parseInt(endPage.value) < parseInt(startPage.value)) {
            startPage.value = endPage.value;
        }
    });

    // Attach splitPDF function to the button click
    splitBtn.addEventListener('click', splitPDF);
});

async function splitPDF() {
    const file = document.getElementById('pdfInput').files[0];
    const notification = document.getElementById('notification');
    const notificationMessage = document.getElementById('notificationMessage');
    
    function showNotification(message) {
        notificationMessage.textContent = message;
        notification.classList.add('active');
    }

    if (!file) {
        showNotification("Please upload a PDF file!"); // Replaced alert
        return;
    }
    
    // Ensure pdf-lib is loaded
    if (typeof PDFLib === 'undefined') {
        console.error("pdf-lib.js is not loaded yet.");
        showNotification("File library is still loading. Please try again in a second.");
        return;
    }

    const start = parseInt(document.getElementById("startPage").value) - 1;
    const end = parseInt(document.getElementById("endPage").value) - 1;
    
    if (start > end) {
        showNotification("Start page cannot be greater than end page!"); // Replaced alert
        return;
    }

    const loading = document.getElementById('loading');
    const splitBtn = document.getElementById('splitBtn');
    const successMessage = document.getElementById('successMessage');
    
    // Show loading state
    loading.style.display = 'block';
    splitBtn.disabled = true;
    splitBtn.textContent = 'Processing...';
    successMessage.classList.remove('active');

    try {
        const existingPdfBytes = await file.arrayBuffer();
        const pdfDoc = await PDFLib.PDFDocument.load(existingPdfBytes);
        
        const totalPages = pdfDoc.getPageCount();
        if (start < 0 || end >= totalPages || start >= totalPages) {
             showNotification(`Invalid page range. Please select pages between 1 and ${totalPages}.`);
             return;
        }

        const newPdf = await PDFLib.PDFDocument.create();

        for (let i = start; i <= end; i++) {
            const [copiedPage] = await newPdf.copyPages(pdfDoc, [i]);
            newPdf.addPage(copiedPage);
        }

        const pdfBytes = await newPdf.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        
        // Create a user-friendly filename
        const originalName = file.name.replace(/\.pdf$/i, '');
        link.download = `${originalName}-pages-${start + 1}-to-${end + 1}.pdf`;
        
        document.body.appendChild(link); // Required for Firefox
        link.click();
        document.body.removeChild(link); // Clean up
        
        // Show success message
        successMessage.classList.add('active');
    } catch (error) {
        console.error('Error splitting PDF:', error);
        showNotification('An error occurred while processing your PDF. Please try again.'); // Replaced alert
    } finally {
        // Hide loading state
        loading.style.display = 'none';
        splitBtn.disabled = false;
        splitBtn.textContent = 'Split & Download PDF';
    }
}
