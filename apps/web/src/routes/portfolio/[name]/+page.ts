import type { PageLoad } from "./$types";

export const load: PageLoad = ({ params }) => {
  return { portfolio: params.name };
};
