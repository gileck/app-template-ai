import { useRouter } from '../../router';
import { NavItem } from '../../components/layout/types';
import { Button } from '@/client/components/ui/button';

interface BottomNavBarProps {
  navItems: NavItem[];
  isStandalone?: boolean;
}

export const BottomNavBar = ({ navItems, isStandalone }: BottomNavBarProps) => {
  const { currentPath, navigate } = useRouter();

  // Get the current navigation value based on the path
  const getCurrentNavValue = () => {
    const index = navItems.findIndex(item => item.path === currentPath);
    return index >= 0 ? index : 0;
  };

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  return (
    <div className={`fixed inset-x-0 bottom-0 z-40 block border-t bg-background/95 sm:hidden ${isStandalone ? 'pb-[env(safe-area-inset-bottom)]' : ''}`}>
      <div className="mx-auto flex max-w-screen-lg items-center justify-between px-2 py-2">
        {navItems.map((item, idx) => (
          <Button
            key={item.path}
            variant={getCurrentNavValue() === idx ? 'secondary' : 'ghost'}
            className="flex-1"
            onClick={() => handleNavigation(item.path)}
          >
            <span className="mr-2 inline-flex">{item.icon}</span>
            {item.label}
          </Button>
        ))}
      </div>
    </div>
  );
};

export default BottomNavBar;
