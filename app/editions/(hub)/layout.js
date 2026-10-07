import DefaultChrome from '@/components/DefaultChrome';

// Archive overview pages (/editions, /editions/all-time) use the normal look.
export default function HubLayout({ children }) {
  return <DefaultChrome>{children}</DefaultChrome>;
}
