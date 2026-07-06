# Components (shadcn/ui)

## Common Imports

```tsx
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

import Link from "next/link";
import Image from "next/image";

import { ArrowRight, Check, Star, Users, Target, ChevronDown } from "lucide-react";
```

## Buttons

Primary button baseline:

```tsx
<Button className="bg-[#0086ca] hover:bg-[#147bbb] text-white transition-all transform hover:scale-105 shadow-md hover:shadow-lg">
  Primary Action
</Button>
```

## Cards

Standard animated card baseline:

```tsx
<Card className="group transition-all duration-300 hover:scale-105 hover:shadow-xl border border-transparent hover:border-[#0086ca]">
  <CardContent className="p-6">Card content</CardContent>
</Card>
```

## Logo Standards

Preferred variants:
- Standard logo for light backgrounds
- White logo for dark backgrounds
- Circular icon for favicons and small placements

Favicon must use the circular icon.

Example:

```tsx
// src/app/layout.tsx
export const metadata = {
  title: "App Name",
  icons: {
    icon: "/images/pa-logo-circle.png",
    shortcut: "/images/pa-logo-circle.png",
    apple: "/images/pa-logo-circle.png",
  },
};
```
