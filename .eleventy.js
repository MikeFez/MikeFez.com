const moment = require('moment');

moment.locale('en');

module.exports = function(eleventyConfig) {
  // Filters for date formatting
  eleventyConfig.addFilter('dateIso', date => {
    return moment(date).toISOString();
  });

  eleventyConfig.addFilter('dateReadable', date => {
    return moment(date).utc().format('LL'); // E.g. May 31, 2019
  });

  // Add excerpt functionality
  eleventyConfig.addShortcode('excerpt', article => extractExcerpt(article));

  // Folders to copy to output folder
  eleventyConfig.addPassthroughCopy("src/css");

  // Return configuration options
  return {
    dir: {
      input: "src",           // Input directory
      output: "_site",        // Output directory
      includes: "_includes",  // Includes directory
      layouts: "_includes",   // Layouts directory
      // If you don't have a _data directory yet, that's fine
      // 11ty will create it if needed when you add data files
    }
  };
};

// Helper function for excerpts
function extractExcerpt(article) {
  if (!article.hasOwnProperty('templateContent')) {
    console.warn('Failed to extract excerpt: Document has no property "templateContent".');
    return null;
  }

  let excerpt = null;
  const content = article.templateContent;

  // The start and end separators to try and match to extract the excerpt
  const separatorsList = [
    { start: '<!-- Excerpt Start -->', end: '<!-- Excerpt End -->' },
    { start: '<p>', end: '</p>' }
  ];

  separatorsList.some(separators => {
    const startPosition = content.indexOf(separators.start);

    // This end position could use "lastIndexOf" to return all the paragraphs rather than just the first
    // paragraph when matching is on "<p>" and "</p>".
    const endPosition = content.indexOf(separators.end);

    if (startPosition !== -1 && endPosition !== -1) {
      excerpt = content.substring(startPosition + separators.start.length, endPosition).trim();
      return true; // Exit out of array loop on first match
    }
  });

  return excerpt;
}