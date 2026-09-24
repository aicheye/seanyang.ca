import Skeleton, { type SkeletonProps } from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'

// Every loading placeholder on the site uses these colours and sweep speed;
// callers set only the shape (size, radius, container class).
export function LoadingSkeleton(
  props: Omit<SkeletonProps, 'baseColor' | 'highlightColor' | 'duration'>,
) {
  return (
    <Skeleton {...props} baseColor="var(--badge-bg)" highlightColor="var(--bg)" duration={1.4} />
  )
}
