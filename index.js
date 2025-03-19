/**
 * index.js
 * A complete Node.js Fulfillment for a Book Recommender Chatbot
 * that handles multiple Intents with "prepared" answers (no DB calls).
 * Now includes fuzzy/substring matching for book_title and author.
 */

const express = require('express');
const bodyParser = require('body-parser');
const { WebhookClient } = require('dialogflow-fulfillment');

const app = express().use(bodyParser.json());

// ====================== 1. Built-in "knowledge base" (mock data) ======================

// 1.1 Book details (BookInformationIntent) 
//     Covers books mentioned in your training phrases (e.g., 1984, War and Peace, Pride and Prejudice, etc.)
//     Each object can contain author, publishedYear, pages, summary, etc.
const bookDetails = {
  "1984": {
    title: "1984",
    author: "George Orwell",
    publishedYear: 1949,
    pages: 328,
    summary: "A dystopian novel that explores totalitarianism, surveillance, and repression."
  },
  "war and peace": {
    title: "War and Peace",
    author: "Leo Tolstoy",
    publishedYear: 1869,
    pages: 1225,
    summary: "A historical novel that chronicles the French invasion of Russia and its impact."
  },
  "pride and prejudice": {
    title: "Pride and Prejudice",
    author: "Jane Austen",
    publishedYear: 1813,
    pages: 279,
    summary: "A romantic novel of manners that deals with issues of class, marriage, and morality."
  },
  "the hunger games": {
    title: "The Hunger Games",
    author: "Suzanne Collins",
    publishedYear: 2008,
    pages: 374,
    summary: "A dystopian novel set in Panem, focusing on the deadly annual Hunger Games."
  },
  "lord of the rings": {
    title: "The Lord of the Rings",
    author: "J.R.R. Tolkien",
    publishedYear: 1954,
    pages: 1178,
    summary: "An epic fantasy trilogy about the quest to destroy the One Ring."
  },
  "to kill a mockingbird": {
    title: "To Kill a Mockingbird",
    author: "Harper Lee",
    publishedYear: 1960,
    pages: 281,
    summary: "A novel about racial injustice in the Deep South, seen through the eyes of a young girl."
  },
  "the great gatsby": {
    title: "The Great Gatsby",
    author: "F. Scott Fitzgerald",
    publishedYear: 1925,
    pages: 180,
    summary: "A critique of the American Dream, set in the Roaring Twenties."
  },
  "little women": {
    title: "Little Women",
    author: "Louisa May Alcott",
    publishedYear: 1868,
    pages: 759,
    summary: "A coming-of-age story about the four March sisters growing up during the Civil War."
  },
  "vampire academy": {
    title: "Vampire Academy",
    author: "Richelle Mead",
    publishedYear: 2007,
    pages: 332,
    summary: "A young adult paranormal romance focusing on a vampire boarding school."
  },
  "heart of darkness": {
    title: "Heart of Darkness",
    author: "Joseph Conrad",
    publishedYear: 1899,
    pages: 96,
    summary: "A novella exploring colonialism in the Congo and the darkness within human nature."
  }
};

// 1.2 Author-based recommendations (AuthorBasedRecommendationIntent)
//     Covers authors mentioned in your training phrases
const authorRecommendations = {
  "louisa may alcott": ["Little Women", "Good Wives", "Jo's Boys"],
  "margaret atwood": ["The Handmaid's Tale", "Oryx and Crake", "Alias Grace"],
  "ernest hemingway": ["The Old Man and the Sea", "A Farewell to Arms", "For Whom the Bell Tolls"],
  "agatha christie": ["Murder on the Orient Express", "And Then There Were None", "The Mysterious Affair at Styles"],
  "neil gaiman": ["American Gods", "Coraline", "Neverwhere", "The Graveyard Book"],
  "john grisham": ["The Firm", "A Time to Kill", "The Pelican Brief"],
  "orson scott card": ["Ender's Game", "Speaker for the Dead", "Xenocide"],
  "jane austen": ["Pride and Prejudice", "Sense and Sensibility", "Emma"]
};

// 1.3 Genre-based recommendations (GenreBasedRecommendationIntent)
//     Your training phrases mention: science fiction, fantasy, mystery, romance, historical fiction, 
//     non-fiction, thriller, young adult, horror, self-help, etc.
const genreRecommendations = {
  "science fiction": ["Dune", "Ender's Game", "Foundation"],
  "fantasy": ["The Hobbit", "A Game of Thrones", "The Name of the Wind"],
  "mystery": ["Gone Girl", "The Girl with the Dragon Tattoo", "In the Woods"],
  "romance": ["Pride and Prejudice", "Me Before You", "The Notebook"],
  "historical fiction": ["The Book Thief", "War and Peace", "All the Light We Cannot See"],
  "non-fiction": ["Sapiens", "Educated", "The Immortal Life of Henrietta Lacks"],
  "thriller": ["The Da Vinci Code", "The Silence of the Lambs", "Misery"],
  "young adult": ["The Hunger Games", "Divergent", "The Fault in Our Stars"],
  "horror": ["The Shining", "It", "House of Leaves"],
  "self-help": ["The 7 Habits of Highly Effective People", "How to Win Friends & Influence People"]
};

// 1.4 Similar books (SimilarBookRecommendationIntent)
//     Your training phrases mention: Game of Thrones, Pride and Prejudice, To Kill a Mockingbird, 1984, 
//     The Great Gatsby, Lord of the Rings, Jane Eyre, The Hunger Games, etc.
const similarBooks = {
  "game of thrones": ["The Name of the Wind", "The Way of Kings", "The Wheel of Time"],
  "pride and prejudice": ["Sense and Sensibility", "Emma", "Wuthering Heights"],
  "to kill a mockingbird": ["The Help", "A Time to Kill", "Go Set a Watchman"],
  "1984": ["Brave New World", "Fahrenheit 451", "We"],
  "the great gatsby": ["This Side of Paradise", "The Sun Also Rises", "The Age of Innocence"],
  "lord of the rings": ["The Silmarillion", "Wheel of Time", "Mistborn"],
  "jane eyre": ["Wuthering Heights", "Rebecca", "North and South"],
  "the hunger games": ["Divergent", "Battle Royale", "The Maze Runner"]
};

// 1.5 Top-rated books (TopRatedBooksIntent)
//     If a user mentions a genre, return some high-rated works for that genre; otherwise, return a general top-rated list
const topRatedByGenre = {
  "science fiction": ["Dune", "Neuromancer", "Ender's Game"],
  "fantasy": ["The Lord of the Rings", "A Song of Ice and Fire", "The Name of the Wind"],
  "mystery": ["The Girl with the Dragon Tattoo", "Gone Girl", "Big Little Lies"],
  "romance": ["Pride and Prejudice", "Outlander", "Jane Eyre"],
  "non-fiction": ["Sapiens", "Educated", "Hiroshima"],
  "horror": ["Dracula", "Frankenstein", "The Haunting of Hill House"]
};
// A general top-rated list if the user did not specify any genre
const topRatedGeneral = [
  "To Kill a Mockingbird",
  "1984",
  "The Great Gatsby",
  "The Catcher in the Rye"
];

// 1.6 Multi-criteria recommendation (MultiCriteriaRecommendationIntent)
//     Your training phrases may include: genre(romance, fantasy, etc.), length(short/long), rated(high-rate, good reviews), pages (<300?), etc.
//     This is a simple demo: combine “short/long + rated + genre” to give some recommendations
function getMultiCriteriaBooks(genre, length, rated) {
  // Example sets for short + high rated, long + high rated, etc.
  const shortHighlyRated = {
    romance: ["Breakfast at Tiffany's (Novella)", "The Princess Bride (relatively short)"],
    fantasy: ["The Ocean at the End of the Lane", "Coraline"],
    horror: ["Carmilla", "We Have Always Lived in the Castle"],
    mystery: ["The Big Sleep", "The Hound of the Baskervilles"],
    nonfiction: ["Man's Search for Meaning", "The Art of War"]
  };
  const longHighlyRated = {
    fantasy: ["The Way of Kings", "The Eye of the World"],
    romance: ["Gone with the Wind", "Outlander"],
    horror: ["IT by Stephen King", "The Stand"],
    mystery: ["The Girl with the Dragon Tattoo", "Lonesome Dove (more western)"],
    nonfiction: ["Team of Rivals", "The Power Broker"]
  };

  genre = genre || null;
  length = length || null;
  rated = rated || null;

  if (!genre) {
    return ["(No specific genre provided) Possibly: '1984', 'Pride and Prejudice', 'The Hobbit'..."];
  }

  genre = genre.toLowerCase();

  // If user wants high-rated or good reviews
  if (rated && (rated.includes("high") || rated.includes("good"))) {
    if (length && length.includes("short")) {
      if (shortHighlyRated[genre]) {
        return shortHighlyRated[genre];
      } else {
        return [`No short highly-rated ${genre} in my list right now.`];
      }
    } else if (length && length.includes("long")) {
      if (longHighlyRated[genre]) {
        return longHighlyRated[genre];
      } else {
        return [`No long highly-rated ${genre} in my list right now.`];
      }
    } else {
      // Just high-rated + genre
      if (topRatedByGenre[genre]) {
        return topRatedByGenre[genre];
      } else {
        return [`No highly-rated ${genre} in my list.`];
      }
    }
  } else {
    // If there's no "rated" or doesn't contain "high/good", just return a normal recommendation
    if (genreRecommendations[genre]) {
      return genreRecommendations[genre];
    } else {
      return [`I don't have multi-criteria data for genre "${genre}" right now.`];
    }
  }
}

// ====================== 1.7 Fuzzy matching helpers for book_title & author ======================

/**
 * Normalize a string by removing punctuation, converting to lowercase, etc.
 */
function normalizeString(str) {
  return str
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // remove punctuation
    .trim();
}

/**
 * Attempt to find the best key in a dictionary that matches userInput by substring.
 * If userInput is contained in the dictionary key (or vice versa), we consider it a match.
 * If multiple keys match, we'll pick the one with the longest normalizedKey length.
 */
function fuzzyMatch(userInput, dictionary) {
  const normalizedInput = normalizeString(userInput);
  let bestMatch = null;
  let bestMatchLength = 0;

  for (const key in dictionary) {
    const normalizedKey = normalizeString(key);

    // Check if userInput is contained in the key or key is contained in userInput
    if (
      normalizedInput.includes(normalizedKey) ||
      normalizedKey.includes(normalizedInput)
    ) {
      // If there's more than one match, pick the one with the longest key
      if (normalizedKey.length > bestMatchLength) {
        bestMatch = key;
        bestMatchLength = normalizedKey.length;
      }
    }
  }

  return bestMatch;
}

// ====================== 2. Intent handlers ======================

/** Default Welcome Intent */
function welcome(agent) {
  agent.add(
    "Hello! I'm your Book Recommender Bot.\n" +
    "I can help you with:\n" +
    "• Author-based recommendations\n" +
    "• Book information\n" +
    "• Genre-based recommendations\n" +
    "• Multi-criteria recommendations\n" +
    "• Similar book suggestions\n" +
    "• Top-rated books\n\n" +
    "Just ask! If you're done, say 'goodbye'."
  );
}

/** Default Fallback Intent */
function fallback(agent) {
  agent.add("I’m sorry, I didn’t catch that. Could you please rephrase?");
}

/** 1) Author-based recommendation */
function authorBasedRecommendation(agent) {
  let author = (agent.parameters.author || "").toLowerCase().trim();

  if (!author) {
    agent.add("Which author are you interested in?");
    return;
  }

  // Direct lookup first
  let recs = authorRecommendations[author];

  if (!recs) {
    // If no direct match, try fuzzy matching
    const fuzzyKey = fuzzyMatch(author, authorRecommendations);
    if (fuzzyKey) {
      recs = authorRecommendations[fuzzyKey];
      author = fuzzyKey; // update the displayed author name to the matched key
    }
  }

  if (recs) {
    agent.add(`Here are some recommended books by ${author}:\n• ${recs.join("\n• ")}`);
  } else {
    agent.add(`I don't have recommendations for "${author}" at the moment.`);
  }
  agent.add("Is there anything else you'd like to know?");
}

/** 2) Book information */
function bookInformation(agent) {
  let book = (agent.parameters.book_info || "").toLowerCase().trim();

  if (!book) {
    agent.add("Which book would you like information about?");
    return;
  }

  // Direct lookup
  let info = bookDetails[book];

  if (!info) {
    // Attempt fuzzy match
    const fuzzyKey = fuzzyMatch(book, bookDetails);
    if (fuzzyKey) {
      info = bookDetails[fuzzyKey];
      book = fuzzyKey; // matched key
    }
  }

  if (!info) {
    agent.add(`I don't have information about "${book}" at the moment.`);
    agent.add("Is there anything else you'd like to know?");
    return;
  }

  // Determine which detail the user wants based on the query text
  const query = agent.query.toLowerCase();
  let response = "";

  if (query.includes("published")) {
    response = `${info.title} was published in ${info.publishedYear}.`;
  } else if (query.includes("page") || query.includes("pages")) {
    response = `${info.title} has about ${info.pages} pages.`;
  } else if (query.includes("who wrote") || query.includes("author")) {
    response = `${info.title} was written by ${info.author}.`;
  } else if (query.includes("about") || query.includes("what is") || query.includes("tell me")) {
    response = `${info.title}: ${info.summary}`;
  } else {
    // Default to summary
    response = `${info.title}: ${info.summary}`;
  }

  agent.add(response);
  agent.add("Is there anything else you'd like to know?");
}

/** 3) Genre-based recommendation */
function genreBasedRecommendation(agent) {
  // Because you have a custom entity for genre, we assume it's recognized properly.
  // We'll keep the logic as is.
  const genre = (agent.parameters.genre || "").toLowerCase().trim();

  if (!genre) {
    agent.add("Which genre are you interested in?");
    return;
  }

  const recs = genreRecommendations[genre];
  if (recs) {
    agent.add(`Here are some ${genre} recommendations:\n• ${recs.join("\n• ")}`);
  } else {
    agent.add(`I'm not sure about "${genre}" right now. I don't have data for that genre.`);
  }
  agent.add("Is there anything else you'd like to know?");
}

/** 4) Multi-criteria recommendation */
function multiCriteriaRecommendation(agent) {
  // We assume genre, length, rated are recognized by your custom entities in Dialogflow
  const genre = (agent.parameters.genre || "").toLowerCase().trim();
  const length = (agent.parameters.length || "").toLowerCase().trim();
  const rated = (agent.parameters.rated || "").toLowerCase().trim();

  if (!genre && !length && !rated) {
    agent.add("Sure, can you specify the genre, length (short/long), or rating preference (high-rate/good reviews) you're looking for?");
    return;
  }

  const results = getMultiCriteriaBooks(genre, length, rated);
  if (results.length > 0) {
    agent.add(`Based on your preferences, here are some suggestions:\n• ${results.join("\n• ")}`);
  } else {
    agent.add("I couldn't find any matches for those criteria, sorry.");
  }
  agent.add("Is there anything else you'd like to know?");
}

/** 5) Similar book recommendation */
function similarBookRecommendation(agent) {
  let bookTitle = (agent.parameters.book_title || "").toLowerCase().trim();

  if (!bookTitle) {
    agent.add("Which book would you like to find something similar to?");
    return;
  }

  // Direct lookup
  let recs = similarBooks[bookTitle];
  if (!recs) {
    // Attempt fuzzy match
    const fuzzyKey = fuzzyMatch(bookTitle, similarBooks);
    if (fuzzyKey) {
      recs = similarBooks[fuzzyKey];
      bookTitle = fuzzyKey; // matched key
    }
  }

  if (recs) {
    agent.add(`Here are some books similar to "${bookTitle}":\n• ${recs.join("\n• ")}`);
  } else {
    agent.add(`I don't have similar titles for "${bookTitle}" at the moment.`);
  }
  agent.add("Is there anything else you'd like to know?");
}

/** 6) Top-rated books */
function topRatedBooks(agent) {
  // Because you have a custom entity for genre, we keep the existing logic.
  const genre = (agent.parameters.genre || "").toLowerCase().trim();

  if (!genre) {
    agent.add(`Some top-rated books in general:\n• ${topRatedGeneral.join("\n• ")}`);
  } else {
    const recs = topRatedByGenre[genre];
    if (recs) {
      agent.add(`Here are some top-rated ${genre} books:\n• ${recs.join("\n• ")}`);
    } else {
      agent.add(`I don't have top-rated ${genre} books on my list right now.`);
    }
  }
  agent.add("Is there anything else you'd like to know?");
}

/** 7) Goodbye Intent */
function goodbye(agent) {
  agent.add("It was my pleasure to help you! Have a great day!");
}

// ====================== 3. Express route & Intent map ======================
app.post('/webhook', (request, response) => {
  const agent = new WebhookClient({ request, response });

  let intentMap = new Map();
  intentMap.set('Default Welcome Intent', welcome);
  intentMap.set('Default Fallback Intent', fallback);

  intentMap.set('AuthorBasedRecommendationIntent', authorBasedRecommendation);
  intentMap.set('BookInformationIntent', bookInformation);
  intentMap.set('GenreBasedRecommendationIntent', genreBasedRecommendation);
  intentMap.set('MultiCriteriaRecommendationIntent', multiCriteriaRecommendation);
  intentMap.set('SimilarBookRecommendationIntent', similarBookRecommendation);
  intentMap.set('TopRatedBooksIntent', topRatedBooks);

  // Custom goodbye intent
  intentMap.set('Goodbye', goodbye);

  agent.handleRequest(intentMap);
});

// ====================== 4. Start server ======================
const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Book Recommender Fulfillment is running on port ${port}`);
});
