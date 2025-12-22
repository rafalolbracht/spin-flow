export interface NavMenuItem {
  label: string;
  href: string;
  icon?: string;
}

export interface UserMenuItem {
  label: string;
  icon: string;
  command: () => void;
  separator?: boolean;
}

