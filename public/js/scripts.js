         
function toggleSidebar() {
    const sidebar = document.getElementById('querySidebar');
    const overlay = document.getElementById('overlay');
    sidebar.classList.toggle('open');
    overlay.classList.toggle('active');
}






 // for report scrolling arrow 
 document.addEventListener('DOMContentLoaded', function() {
    const tableContainer = document.querySelector('.table-container');
    const tableWrapper = document.querySelector('.table-wrapper');
    const leftButton = document.querySelector('.scroll-button.left');
    const rightButton = document.querySelector('.scroll-button.right');
    
    // Check if elements exist (for pages without the table)
    if (!tableContainer) return;
    
    // Update button states based on scroll position
    function updateButtonStates() {
        const scrollLeft = tableWrapper.scrollLeft;
        const maxScroll = tableWrapper.scrollWidth - tableWrapper.clientWidth;
        
        leftButton.disabled = scrollLeft <= 0;
        rightButton.disabled = scrollLeft >= maxScroll - 1; // -1 to account for rounding
    }
    
    // Scroll left
    leftButton.addEventListener('click', function() {
        tableWrapper.scrollBy({
            left: -200,
            behavior: 'smooth'
        });
    });
    
    // Scroll right
    rightButton.addEventListener('click', function() {
        tableWrapper.scrollBy({
            left: 200,
            behavior: 'smooth'
        });
    });
    
    // Update on scroll
    tableWrapper.addEventListener('scroll', updateButtonStates);
    
    // Initial check
    updateButtonStates();
    
    // Update on window resize
    window.addEventListener('resize', updateButtonStates);
});