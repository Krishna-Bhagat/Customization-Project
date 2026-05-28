import { Navigate, useParams, useSearchParams } from "react-router-dom";

// Legacy compatibility page.
// Current flow starts from `/product/:id` and goes to `/customize/:id/workspace`.
const CustomizePage = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const size = searchParams.get("size");
  const targetPath = size ? `/product/${id}?size=${encodeURIComponent(size)}` : `/product/${id}`;

  return <Navigate to={targetPath} replace />;
};

export default CustomizePage;
