// Reusable loading button component
const LoadingButton = ({ loading, text, loadingText }) => (
  <button
    type="submit"
    className="w-full py-2 bg-blue-600 text-white rounded-md"
    disabled={loading}
  >
    {loading ? loadingText : text}
  </button>
);

export default LoadingButton;