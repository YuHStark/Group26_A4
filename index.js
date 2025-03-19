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
//     Each object can contain author, publishedYear, pages, description, etc.
const bookDetails = {
  "1984": {
    title: "1984",
    author: "George Orwell",
    publishedYear: 1949,
    pages: 328,
    description: "1984 reduce a su esencia luchas humanas en las que la razón ha perdido toda referencia moral colectiva creando una verdadera pesadilla sin salida. Es, en ese sentido, una fábula aterradora que habla de los efectos de construcciones humanas que han escapado a todo control y que emplean métodos de educación y destrucción de la personalidad individual y colectiva para aniquilar a los disidentes y educar a las nuevas generaciones en una barbarie que no cuestione el sistema de dominación. Esta obra maestra del genial escritor ingles fue escrita en 1948, en el Londres pos-guerra, por un Orwell desolado que había visto y vivido los horrores del fascismo y las consecuencias del estalinismo en la España de la República y en la tragedia de la Europa Contemporánea."
  },
  "war and peace": {
    title: "War and Peace",
    author: "Leo Tolstoy",
    publishedYear: 1869,
    pages: 1225,
    description: "From the award-winning translators of Anna Karenina and The Brothers Karamazov comes this magnificent new translation of Tolstoy's masterwork. War and Peace broadly focuses on Napoleon’s invasion of Russia in 1812 and follows three of the most well-known characters in literature: Pierre Bezukhov, the illegitimate son of a count who is fighting for his inheritance and yearning for spiritual fulfillment; Prince Andrei Bolkonsky, who leaves his family behind to fight in the war against Napoleon; and Natasha Rostov, the beautiful young daughter of a nobleman who intrigues both men.A s Napoleon’s army invades, Tolstoy brilliantly follows characters from diverse backgrounds—peasants and nobility, civilians and soldiers—as they struggle with the problems unique to their era, their history, and their culture. And as the novel progresses, these characters transcend their specificity, becoming some of the most moving—and human—figures in world literature."
  },
  "pride and prejudice": {
    title: "Pride and Prejudice",
    author: "Jane Austen",
    publishedYear: 1813,
    pages: 279,
    description: "It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.\" Next to the exhortation at the beginning of Moby-Dick, \"Call me Ishmael,\" the first sentence of Jane Austen's Pride and Prejudice must be among the most quoted in literature. And certainly what Melville did for whaling Austen does for marriage--tracing the intricacies (not to mention the economics) of 19th-century British mating rituals with a sure hand and an unblinking eye. As usual, Austen trains her sights on a country village and a few families--in this case, the Bennets, the Philips, and the Lucases. Into their midst comes Mr. Bingley, a single man of good fortune, and his friend, Mr. Darcy, who is even richer. Mrs. Bennet, who married above her station, sees their arrival as an opportunity to marry off at least one of her five daughters. Bingley is complaisant and easily charmed by the eldest Bennet girl, Jane; Darcy, however, is harder to please. Put off by Mrs. Bennet's vulgarity and the untoward behavior of the three younger daughters, he is unable to see the true worth of the older girls, Jane and Elizabeth. His excessive pride offends Lizzy, who is more than willing to believe the worst that other people have to say of him; when George Wickham, a soldier stationed in the village, does indeed have a discreditable tale to tell, his words fall on fertile ground. Having set up the central misunderstanding of the novel, Austen then brings in her cast of fascinating secondary characters: Mr. Collins, the sycophantic clergyman who aspires to Lizzy's hand but settles for her best friend, Charlotte, instead; Lady Catherine de Bourgh, Mr. Darcy's insufferably snobbish aunt; and the Gardiners, Jane and Elizabeth's low-born but noble-hearted aunt and uncle. Some of Austen's best comedy comes from mixing and matching these representatives of different classes and economic strata, demonstrating the hypocrisy at the heart of so many social interactions. And though the novel is rife with romantic misunderstandings, rejected proposals, disastrous elopements, and a requisite happy ending for those who deserve one, Austen never gets so carried away with the romance that she loses sight of the hard economic realities of 19th-century matrimonial maneuvering. Good marriages for penniless girls such as the Bennets are hard to come by, and even Lizzy, who comes to sincerely value Mr. Darcy, remarks when asked when she first began to love him: \"It has been coming on so gradually, that I hardly know when it began. But I believe I must date it from my first seeing his beautiful grounds at Pemberley.\" She may be joking, but there's more than a little truth to her sentiment, as well. Jane Austen considered Elizabeth Bennet \"as delightful a creature as ever appeared in print\". Readers of Pride and Prejudice would be hard-pressed to disagree. --Alix Wilber"
  },
  "the hunger games": {
    title: "The Hunger Games",
    author: "Suzanne Collins",
    publishedYear: 2008,
    pages: 374,
    description: "Winning will make you famous. Losing means certain death.The nation of Panem, formed from a post-apocalyptic North America, is a country that consists of a wealthy Capitol region surrounded by 12 poorer districts. Early in its history, a rebellion led by a 13th district against the Capitol resulted in its destruction and the creation of an annual televised event known as the Hunger Games. In punishment, and as a reminder of the power and grace of the Capitol, each district must yield one boy and one girl between the ages of 12 and 18 through a lottery system to participate in the games. The 'tributes' are chosen during the annual Reaping and are forced to fight to the death, leaving only one survivor to claim victory.When 16-year-old Katniss's young sister, Prim, is selected as District 12's female representative, Katniss volunteers to take her place. She and her male counterpart Peeta, are pitted against bigger, stronger representatives, some of whom have trained for this their whole lives. , she sees it as a death sentence. But Katniss has been close to death before. For her, survival is second nature."
  },
  "lord of the rings": {
    title: "The Lord of the Rings",
    author: "J.R.R. Tolkien",
    publishedYear: 1954,
    pages: 1178,
    description: "Peter Jackson's The Fellowship of the Ring has become one of ther most successful and visually stunning movies ever made. But that was only the beginning. For The Two Towers, the second part of the trilogy, the artists and designers knew that they would have to surpass even their own outstanding achievements. Within the   of this authoritative and insightful book are the incredible results of their work.The Art of The Two Towers illustrates the creative development of the film from sketches to special effects, and features more than 600 images, most appearing nowhere else. This official, fully authorized book includes pencil sketches by Alan Lee and John Howe, costume designs by Oscar-nominated Ngila Dickson and magnificent full-color paintings, sculptures and digital artwork from Oscar-winner Richard Taylor's Weta Workshop. All the spectacular landscapes, costumes, buildings, armor and creatures are covered in stunning detail, including concepts for characters and scenes which did not make it into the film.Accompanying this wealth of imagery are detailed and informative commentaries by all of the features artists, designers and other key personnel, together with a special afterword by Andy Serkis, the actor who breathed life into Gollum. Their thoughts and explanations give a unique and fascinating insight into how The Two Towers was brought to life, and how J.R.R. Tolkien's spellbinding literary descriptions were transformed into unforgettable movie magic."
  },
  "to kill a mockingbird": {
    title: "To Kill a Mockingbird",
    author: "Harper Lee",
    publishedYear: 1960,
    pages: 281,
    description: "An unforgettable story of the violent, intolerant, eccentric, humorous and prejudiced Deep South seen through the eyes of children.With warmth and understanding Harper Lee brilliantly recreates not only her characters but a whole town and its way of life.Scout and Jem Finch lose their innocence when their lawyer father defends a Negro charged with the rape of a white girl.The lawyer is the town's conscience, but conscience makes more than cowards..."
  },
  "the great gatsby": {
    title: "The Great Gatsby",
    author: "F. Scott Fitzgerald",
    publishedYear: 1925,
    pages: 180,
    description: "The Great Gatsby, F. Scott Fitzgerald’s third book, stands as the supreme achievement of his career. This exemplary novel of the Jazz Age has been acclaimed by generations of readers. The story of the fabulously wealthy Jay Gatsby and his love for the beautiful Daisy Buchanan, of lavish parties on Long Island at a time when The New York Times noted “gin was the national drink and sex the national obsession,” it is an exquisitely crafted tale of America in the 1920s. The Great Gatsby is one of the great classics of twentieth-century literature. The timeless story of Jay Gatsby and his love for Daisy Buchanan is widely acknowledged to be the closest thing to the Great American Novel ever written."
  },
  "little women": {
    title: "Little Women",
    author: "Louisa May Alcott",
    publishedYear: 1868,
    pages: 759,
    description: "No home library is complete without the classics! Little Women is a keepsake to be read and treasured.When Little Women was first published in 1868, it became an instant bestseller. The book’s gentle lessons and charming story of four adventurous sisters coming of age in Civil War-era New England was originally written as a children’s book, but quickly captured the hearts and attention of readers of all ages. Now part of the Word Cloud Classics series, Little Women is a must-have addition to the libraries of all classic literature lovers. About the Word Cloud Classics series:Classic works of literature with a clean, modern aesthetic! Perfect for both old and new literature fans, the Word Cloud Classics series from Canterbury Classics provides a chic and inexpensive introduction to timeless tales. With a higher production value, including heat burnished covers and foil stamping, these eye-catching, easy-to-hold editions are the perfect gift for students and fans of literature everywhere."
  },
  "vampire academy": {
    title: "Vampire Academy",
    author: "Richelle Mead",
    publishedYear: 2007,
    pages: 332,
    description: "Only a true best friend can protect you from your immortal enemies . . . Lissa Dragomir is a Moroi princess: a mortal vampire with a rare gift for harnessing the earth's magic. She must be protected at all times from Strigoi; the fiercest vampires - the ones who never die. The powerful blend of human and vampire blood that flows through Rose Hathaway, Lissa's best friend, makes her a dhampir. Rose is dedicated to a dangerous life of protecting Lissa from the Strigoi, who are hell-bent on making Lissa one of them.After two years of freedom, Rose and Lissa are caught and dragged back to St. Vladimir's Academy, a school for vampire royalty and their guardians-to-be, hidden in the deep forests of Montana. But inside the iron gates, life is even more fraught with danger . . . and the Strigoi are always close by.Rose and Lissa must navigate their dangerous world, confront the temptations of forbidden love, and never once let their guard down, lest the evil undead make Lissa one of them forever . . ."
  },
  "heart of darkness": {
    title: "Heart of Darkness",
    author: "Joseph Conrad",
    publishedYear: 1899,
    pages: 96,
    description: "Dark allegory describes the narrator's journey up the Congo River and his meeting with, and fascination by, Mr. Kurtz, a mysterious personage who dominates the unruly inhabitants of the region. Masterly blend of adventure, character development, psychological penetration. Considered by many Conrad's finest, most enigmatic story."
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
//     The training phrases mention: science fiction, fantasy, mystery, romance, historical fiction, 
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
//     The training phrases mention: Game of Thrones, Pride and Prejudice, To Kill a Mockingbird, 1984, 
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
  }else if (
    query.includes("introduce") ||
    query.includes("i want to know") ||
    (query.includes("tell me about") && query.includes(info.title.toLowerCase()))
) {
    // Return ALL information about the book
    response = 
      `Here's everything about "${info.title}":\n` +
      `• Author: ${info.author}\n` +
      `• Published: ${info.publishedYear}\n` +
      `• Pages: ${info.pages}\n` +
      `• Book Description: ${info.description}`;

  } else if (query.includes("about") || query.includes("what is") || query.includes("tell me")) {
    response = `${info.title}: ${info.description}`;
  } else {
    // Default to description
    response = `${info.title}: ${info.description}`;
  }

  agent.add(response);
  agent.add("Is there anything else you'd like to know?");
}

/** 3) Genre-based recommendation */
function genreBasedRecommendation(agent) {
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
  // We assume genre, length, rated are recognized by the custom entities in Dialogflow
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
