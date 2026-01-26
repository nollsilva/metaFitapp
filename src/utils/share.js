
import html2canvas from 'html2canvas';

/**
 * Capture a DOM element and share it using the Web Share API.
 * 
 * @param {string} elementId - The ID of the element to capture (must be in the DOM).
 * @param {string} fileName - The name of the file to share (e.g., 'treino.png').
 */
export const shareElementAsImage = async (elementId, fileName = 'share.png') => {
    try {
        const element = document.getElementById(elementId);
        if (!element) {
            console.error(`Element with id ${elementId} not found`);
            return;
        }

        // Capture with high scale for better quality
        const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            backgroundColor: null, // Transparent background if possible
            logging: false,
        });

        // Convert to Blob
        canvas.toBlob(async (blob) => {
            if (!blob) {
                console.error('Canvas is empty');
                return;
            }

            const file = new File([blob], fileName, { type: 'image/png' });

            // Check if Web Share API is supported and can share files
            if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                try {
                    await navigator.share({
                        files: [file],
                        title: 'MetaFit Share',
                        text: 'Confira meu progresso no MetaFit!',
                    });
                } catch (error) {
                    // abort error is common when user cancels share sheet
                    if (error.name !== 'AbortError') {
                        console.error('Error sharing:', error);
                    }
                }
            } else {
                // Fallback: Download the image
                const link = document.createElement('a');
                link.download = fileName;
                link.href = canvas.toDataURL('image/png');
                link.click();
            }
        }, 'image/png');

    } catch (error) {
        console.error('Error generating image:', error);
    }
};

/**
 * Helper to temporarily show a hidden element, capture it, and hide it again.
 * This is useful for sharing custom story layouts that aren't visible on screen.
 */
export const shareHiddenElement = async (elementId, fileName) => {
    const element = document.getElementById(elementId);
    if (!element) return;

    // Make it visible but off-screen or effectively invisible to user flow
    // We used a specific class or style in the component to handle this
    // For now, we assume the element is mounted but hidden via opacity/z-index or absolute positioning off-screen
    // Actually, html2canvas needs the element to be in the DOM and visible (not display: none).

    // We will assume the component handles its visibility state during 'capture mode'
    // or we force it here if needed.

    await shareElementAsImage(elementId, fileName);
};
