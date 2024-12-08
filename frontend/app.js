const uploadButton = document.getElementById('uploadButton');
const fileInput = document.getElementById('fileInput');
const screenshotsContainer = document.getElementById('screenshots-container');

uploadButton.addEventListener('click', () => {
    const file = fileInput.files[0];
    if (!file) {
        alert('Please select a file to upload.');
        return;
    }

    // Convert the file to a data URL and display it
    const reader = new FileReader();
    reader.onload = (event) => {
        const screenshotUrl = event.target.result;

        // Display the uploaded screenshot
        const img = document.createElement('img');
        img.src = screenshotUrl;
        img.alt = "Uploaded Screenshot";
        screenshotsContainer.appendChild(img);

        // Clear the file input
        fileInput.value = '';
    };
    reader.readAsDataURL(file);
});
