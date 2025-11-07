import React from 'react';

const SearchResults = ({ results, type }) => {
  if (!results || results.length === 0) {
    return <p>No results found.</p>;
  }

  return (
    <div>
      <h2>{type === 'book' ? 'Books' : 'Movies'}</h2>
      <ul>
        {results.map((result) => (
          <li key={result.id}>
            <h3>{result.title}</h3>
            {type === 'book' && <p>Author: {result.authors}</p>}
            <p>{result.description}</p>
            {result.image_url && <img src={result.image_url} alt={result.title} />}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SearchResults;