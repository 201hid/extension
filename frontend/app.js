const uploadButton = document.getElementById('uploadButton');
const fileInput = document.getElementById('fileInput');
const screenshotsContainer = document.getElementById('screenshots-container');
const refreshButton = document.getElementById('refreshButton');


function loadScreenshots() {
    // Fetch screenshots from S3 bucket
    const bucketUrl = "https://varifyy-screenshots.s3.YOUR_AWS_REGION.amazonaws.com";
    fetch(`${bucketUrl}/?list-type=2`) // Adjust query params for S3 API
        .then(response => response.text())
        .then(xml => {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xml, "application/xml");
            const keys = xmlDoc.getElementsByTagName("Key");
            screenshotsContainer.innerHTML = ""; // Clear the container
            for (const key of keys) {
                const img = document.createElement("img");
                img.src = `${bucketUrl}/${key.textContent}`;
                img.alt = "Screenshot";
                screenshotsContainer.appendChild(img);
            }
        })
        .catch(error => console.error("Error fetching screenshots:", error));
}



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
