import { useQuery } from '@tanstack/react-query';
import { BASE_URL } from '../utils/constants';

export const useProjectId = () => {
  const query = useQuery({ queryKey: ['project-id'], queryFn: getProjectId, refetchOnWindowFocus: false });
  return query.data;
};

const getProjectId = async () => {
  const res = await fetch(`${BASE_URL}/.netlify/functions/project-id`, {
    method: 'GET',
  });

  if (res.ok) {
    const result = (await res.json()) as { value: string };
    console.log(result);
    return result.value;
  }
  return undefined;
};
