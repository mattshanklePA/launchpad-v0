# PA UI Quick Reference

Copy-paste ready code snippets for Packaged Agile interfaces.

---

## Buttons

### Primary Button
```tsx
<Button className="bg-[#0086ca] hover:bg-[#147bbb] text-white transition-all transform hover:scale-105 shadow-md hover:shadow-lg">
  Primary Action
</Button>
```

### Large Hero Button
```tsx
<Button className="bg-[#0086ca] hover:bg-[#147bbb] text-white transition-all transform hover:scale-105 shadow-md hover:shadow-lg text-xl px-8 py-4">
  Get Started
</Button>
```

### Secondary/Outline Button
```tsx
<Button className="border border-[#0086ca] text-[#0086ca] hover:bg-[#0086ca] hover:text-white transition-all transform hover:scale-105 shadow-md hover:shadow-lg px-6 py-3 rounded-lg font-semibold">
  Learn More
</Button>
```

### White Outline (on colored bg)
```tsx
<Button className="border-2 border-white text-white hover:bg-white hover:text-[#0086ca] transition-all transform hover:scale-105 shadow-md hover:shadow-lg px-6 py-3 rounded-lg font-semibold">
  Secondary Action
</Button>
```

### Ghost Button
```tsx
<Button className="text-[#0086ca] hover:bg-[#0086ca]/10 transition-all transform hover:scale-105 shadow-md hover:shadow-lg px-6 py-3 rounded-lg">
  Ghost Action
</Button>
```

---

## Cards

### Standard Animated Card
```tsx
<Card className="group transition-all duration-300 hover:scale-105 hover:shadow-xl border border-transparent hover:border-[#0086ca]">
  <CardContent className="p-6">
    <div className="group-hover:text-[#0086ca] transition-colors duration-300 mb-4">
      <Icon className="w-12 h-12" />
    </div>
    <h3 className="text-2xl font-semibold mb-3">Card Title</h3>
    <p className="text-gray-600 mb-4">Card description text goes here.</p>
  </CardContent>
</Card>
```

### Service Card with Button
```tsx
<Card className="group transition-all duration-300 hover:scale-105 hover:shadow-xl border border-transparent hover:border-[#0086ca] p-6 rounded-2xl">
  <CardContent>
    <div className="group-hover:text-[#0086ca] transition-colors duration-300 mb-4">
      <Target className="w-12 h-12" />
    </div>
    <h3 className="text-2xl font-semibold mb-3">Service Name</h3>
    <p className="text-gray-600 mb-4">Description of service benefits and outcomes.</p>
    <Button className="bg-[#0086ca] hover:bg-[#147bbb] text-white transition-all transform hover:scale-105 shadow-md hover:shadow-lg">
      Learn More
    </Button>
  </CardContent>
</Card>
```

### Metrics Card
```tsx
<div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
  <div className="flex items-center justify-between mb-2">
    <span className="text-3xl font-bold text-[#0086ca]">64%</span>
    <ArrowUp className="w-6 h-6 text-green-500" />
  </div>
  <p className="text-gray-600">Productivity Increase</p>
</div>
```

---

## Sections

### Hero Section (Full)
```tsx
<section className="bg-gradient-to-br from-blue-800 to-purple-700 text-white py-24 md:py-32 min-h-[640px] flex items-center">
  <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
    <div className="text-center">
      <h1 className="text-4xl md:text-6xl font-bold leading-normal text-white mb-6">
        Hero Title Here
      </h1>
      <p className="text-lg md:text-xl text-white/90 max-w-3xl mx-auto mb-8">
        Subheadline that explains the value proposition clearly.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button className="bg-[#0086ca] hover:bg-[#147bbb] text-white transition-all transform hover:scale-105 shadow-md hover:shadow-lg text-lg px-8 py-4">
          Primary CTA
        </Button>
        <Button className="border-2 border-white text-white hover:bg-white hover:text-[#0086ca] transition-all transform hover:scale-105 shadow-md hover:shadow-lg text-lg px-8 py-4">
          Secondary CTA
        </Button>
      </div>
    </div>
  </div>
</section>
```

### Content Section (White)
```tsx
<SectionDivider wrapperClassName="bg-white" />
<section className="py-16 bg-white scroll-mt-16">
  <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
    <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
      Section Title
    </h2>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {/* Cards or content */}
    </div>
  </div>
</section>
```

### Content Section (Gray)
```tsx
<SectionDivider wrapperClassName="bg-gray-50" />
<section className="py-16 bg-gray-50 scroll-mt-16">
  <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
    <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
      Section Title
    </h2>
    {/* Content */}
  </div>
</section>
```

### Banner Section (Gradient)
```tsx
<section className="bg-gradient-to-r from-blue-800 to-purple-700/60 text-white py-16">
  <div className="container mx-auto text-center px-4">
    <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
      Call to Action Headline
    </h2>
    <p className="text-lg text-white/90 max-w-2xl mx-auto mb-8">
      Supporting text that explains the value.
    </p>
    <Button className="bg-[#0086ca] hover:bg-[#147bbb] text-white transition-all transform hover:scale-105 shadow-md hover:shadow-lg text-lg px-8 py-4">
      Get Started
    </Button>
  </div>
</section>
```

---

## Grids

### 3-Column Grid
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
  {items.map((item, index) => (
    <Card key={index} className="group transition-all duration-300 hover:scale-105 hover:shadow-xl border border-transparent hover:border-[#0086ca]">
      <CardContent className="p-6">
        {/* Card content */}
      </CardContent>
    </Card>
  ))}
</div>
```

### 2-Column Split Layout
```tsx
<div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
  <div>
    <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
      Left Side Title
    </h2>
    <p className="text-lg text-gray-600 mb-8">
      Description text goes here.
    </p>
  </div>
  <div>
    <img src="/images/illustration.png" alt="" className="w-full rounded-lg shadow-lg" />
  </div>
</div>
```

### Metrics Grid (3 cols)
```tsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
  <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
    <span className="text-3xl font-bold text-[#0086ca]">64%</span>
    <p className="text-gray-600 mt-2">Productivity Increase</p>
  </div>
  <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
    <span className="text-3xl font-bold text-[#0086ca]">$1.2B</span>
    <p className="text-gray-600 mt-2">Benefits Delivered</p>
  </div>
  <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
    <span className="text-3xl font-bold text-[#0086ca]">18+</span>
    <p className="text-gray-600 mt-2">Federal Agencies</p>
  </div>
</div>
```

---

## Text & Typography

### Gradient Text Highlight
```tsx
<span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent font-bold">
  Highlighted text
</span>
```

### Badge (Text Only - No Emojis)
```tsx
<Badge variant="secondary" className="bg-blue-100 text-[#0086ca]">
  HUBZone Certified
</Badge>
```

### Tag (Pill Style)
```tsx
<Link 
  href={`/tags/${tag}`}
  className="inline-block bg-blue-100 text-[#0086ca] hover:bg-blue-200 hover:text-[#147bbb] px-3 py-1 rounded-full text-xs font-medium transition-colors duration-200"
>
  {tag}
</Link>
```

---

## Forms

### Contact Form Input
```tsx
<div className="space-y-2">
  <Label htmlFor="name">Name *</Label>
  <Input
    id="name"
    name="name"
    required
    className="w-full rounded-lg border-gray-300 focus:ring-2 focus:ring-[#0086ca] focus:border-transparent"
  />
</div>
```

### Form Submit Button
```tsx
<Button 
  type="submit" 
  disabled={isSubmitting}
  className="w-full bg-[#0086ca] hover:bg-[#147bbb] text-white transition-all transform hover:scale-105 shadow-md hover:shadow-lg"
>
  {isSubmitting ? 'Sending...' : 'Send Message'}
</Button>
```

---

## Colors Reference

```css
/* Primary Blue */
#0086ca

/* Hover Blue */  
#147bbb

/* Light Blue */
#44ace0

/* Red (Destructive) */
#ee2a3e

/* Yellow (Warning) */
#ffd107

/* Green (Success) */
#2ca249

/* Purple (Accent) */
#52398f

/* Orange (Energy) */
#f06325
```

---

## Common Imports

```tsx
// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Custom Components
import { SectionDivider } from "@/components/section-divider";

// Icons
import { ArrowRight, ArrowUp, Check, Star, Users, Target, ChevronDown } from "lucide-react";

// Next.js
import Link from "next/link";
import Image from "next/image";
```
