import React from "react";

const Spinner = ({ size = 18 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 50 50"
    style={{ marginRight: 8 }}
  >
    <circle
      cx="25"
      cy="25"
      r="20"
      fill="none"
      stroke="#007bff"
      strokeWidth="5"
      strokeLinecap="round"
      strokeDasharray="31.4 31.4"
    >
      <animateTransform
        attributeName="transform"
        type="rotate"
        from="0 25 25"
        to="360 25 25"
        dur="0.9s"
        repeatCount="indefinite"
      />
    </circle>
  </svg>
);

export default Spinner;
