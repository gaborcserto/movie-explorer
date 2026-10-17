import './popcornIllustration.scss';

function PopcornIllustration() {
  return (
    <svg
      className="popcorn-illustration"
      viewBox="0 0 240 240"
      fill="none"
      stroke="currentColor"
      strokeWidth="5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <g className="popcorn-illustration__bucket">
        <path d="M62 104c-12-3-15-18-5-25-5-13 8-24 20-18 2-15 21-20 30-8 9-12 28-7 29 8 13-8 28 1 27 15 16-3 26 13 17 25" />
        <path d="M82 82c-1-10 11-16 18-9m14 20c-4-10 6-20 16-16m18 14c2-8 10-12 17-8" />
        <path d="M55 105h130l-18 105a9 9 0 0 1-9 8H82a9 9 0 0 1-9-8Z" />
        <path d="m96 119 7 84m41-84-7 84M62 119h116" />
      </g>
      <path
        className="popcorn-illustration__kernel popcorn-illustration__kernel--first"
        d="M52 42c-8 0-12-9-6-15-2-9 11-13 15-5 9 0 11 12 3 15-1 6-8 9-12 5Z"
      />
      <path
        className="popcorn-illustration__kernel popcorn-illustration__kernel--second"
        d="M188 58c-7-2-8-12-1-15 1-9 13-9 15-1 8 3 5 14-3 14-3 5-8 6-11 2Z"
      />
    </svg>
  );
}

export default PopcornIllustration;
