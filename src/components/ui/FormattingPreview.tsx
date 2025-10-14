import React, { useState } from 'react';
import { MarkdownRenderer } from './MarkdownRenderer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';
import { Button } from './button';
import { Badge } from './badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';
import { BookOpen, Calculator, FileText, Eye } from 'lucide-react';

const scholarlyExample = `# Literature Review: Digital Transformation in Healthcare

## Introduction

Digital transformation has emerged as a **critical paradigm shift** in modern healthcare systems. According to *Smith et al. (2023)*, healthcare organizations are increasingly adopting digital technologies to improve patient outcomes and operational efficiency.

> "The integration of digital technologies in healthcare represents not merely a technological upgrade, but a fundamental reimagining of care delivery models." - Johnson & Lee (2024)

## Key Areas of Digital Transformation

### 1. Electronic Health Records (EHR)
- Improved data accessibility
- Enhanced patient safety
- Better care coordination

### 2. Telemedicine Platforms
- Remote patient monitoring
- Virtual consultations
- Reduced healthcare costs

## Comparative Analysis

| Technology | Implementation Rate | Patient Satisfaction | Cost Impact |
|------------|--------------------|--------------------|-------------|
| EHR Systems | 85% | High | Medium |
| Telemedicine | 67% | Very High | Low |
| AI Diagnostics | 34% | Medium | High |

[FIGURE 1: Digital transformation adoption rates across healthcare sectors]

## Conclusion

The evidence suggests that digital transformation initiatives yield significant benefits for both healthcare providers and patients, though challenges remain in implementation and standardization.

## References

- Johnson, A., & Lee, B. (2024). *Digital Healthcare Revolution*. Medical Technology Press.
- Smith, C., et al. (2023). Healthcare digitalization trends. *Journal of Medical Innovation*, 15(3), 245-267.`;

const technicalExample = `# Physics Problem: Projectile Motion Analysis

## Given Information

- **Initial velocity**: $v_0 = 25$ m/s
- **Launch angle**: $\\theta = 45°$
- **Acceleration due to gravity**: $g = 9.81$ m/s²

## Solution

### Step 1: Decompose Initial Velocity

The initial velocity components are:

$$v_{0x} = v_0 \\cos(\\theta) = 25 \\cos(45°) = 25 \\times 0.707 = 17.68 \\text{ m/s}$$

$$v_{0y} = v_0 \\sin(\\theta) = 25 \\sin(45°) = 25 \\times 0.707 = 17.68 \\text{ m/s}$$

### Step 2: Calculate Maximum Height

Using the kinematic equation: $v_y^2 = v_{0y}^2 - 2gh_{max}$

At maximum height, $v_y = 0$:

$$h_{max} = \\frac{v_{0y}^2}{2g} = \\frac{(17.68)^2}{2 \\times 9.81} = \\frac{312.58}{19.62} = 15.93 \\text{ m}$$

### Step 3: Calculate Time of Flight

$$t_{flight} = \\frac{2v_{0y}}{g} = \\frac{2 \\times 17.68}{9.81} = 3.61 \\text{ s}$$

### Step 4: Calculate Range

$$R = v_{0x} \\times t_{flight} = 17.68 \\times 3.61 = 63.82 \\text{ m}$$

> **Key Principle**: For projectile motion at 45°, the range is maximized for a given initial velocity.

## Results Summary

| Parameter | Value | Units |
|-----------|-------|-------|
| Maximum Height | 15.93 | m |
| Time of Flight | 3.61 | s |
| Range | 63.82 | m |

[FIGURE 1: Projectile trajectory showing parabolic path with key measurements]

## **Final Answer**

The projectile reaches a **maximum height of 15.93 m**, has a **flight time of 3.61 s**, and travels a **horizontal distance of 63.82 m**.`;

const batchExample = `# The Impact of Artificial Intelligence on Modern Education Systems

## Executive Summary

This comprehensive analysis examines the transformative role of artificial intelligence in contemporary educational environments, exploring both opportunities and challenges.

## Chapter 1: Introduction to AI in Education

### 1.1 Defining Educational AI

Artificial Intelligence in education refers to the application of machine learning, natural language processing, and adaptive algorithms to enhance learning experiences and educational outcomes.

### 1.2 Historical Context

The evolution of educational technology has progressed through several distinct phases:

1. **Computer-Assisted Learning (1960s-1980s)**
2. **Internet-Based Learning (1990s-2000s)**
3. **Mobile Learning (2000s-2010s)**
4. **AI-Powered Education (2010s-Present)**

[FIGURE 1: Timeline of educational technology evolution]

## Chapter 2: Key Applications of AI in Education

### 2.1 Personalized Learning Systems

> "AI enables unprecedented levels of personalization in education, adapting to individual learning styles, pace, and preferences." - Educational Technology Research Council (2024)

**Benefits include:**
- Adaptive content delivery
- Real-time performance assessment
- Customized learning pathways

### 2.2 Intelligent Tutoring Systems

| System Type | Effectiveness | Implementation Cost | Student Satisfaction |
|-------------|---------------|--------------------|--------------------|
| Math Tutors | 85% | Medium | High |
| Language Learning | 78% | Low | Very High |
| Science Labs | 72% | High | Medium |

[FIGURE 2: Comparative effectiveness of different AI tutoring systems]

### 2.3 Automated Assessment and Grading

AI-powered assessment tools offer several advantages:

- **Consistency**: Eliminates subjective bias in grading
- **Efficiency**: Rapid feedback for students
- **Analytics**: Detailed performance insights

## Chapter 3: Challenges and Ethical Considerations

### 3.1 Data Privacy and Security

The implementation of AI in education raises significant concerns regarding student data protection and privacy rights.

### 3.2 Digital Divide

Not all students have equal access to AI-powered educational tools, potentially exacerbating existing educational inequalities.

[FIGURE 3: Global distribution of AI education access by region]

## Conclusion

AI represents both tremendous opportunity and significant responsibility in education. Successful implementation requires careful consideration of ethical implications, equitable access, and pedagogical effectiveness.

## References

- Brown, M. (2024). *AI in Education: Opportunities and Challenges*. Academic Press.
- Davis, R., et al. (2023). Personalized learning through artificial intelligence. *Educational Technology Review*, 45(2), 123-145.`;

export const FormattingPreview: React.FC = () => {
  const [activeExample, setActiveExample] = useState<'scholarly' | 'technical' | 'batch'>('scholarly');

  const examples = {
    scholarly: {
      title: 'Scholarly Writing Example',
      description: 'Academic essay with proper citations, headings, and formatting',
      content: scholarlyExample,
      icon: BookOpen
    },
    technical: {
      title: 'Technical Solution Example',
      description: 'Mathematical problem with LaTeX equations and step-by-step solutions',
      content: technicalExample,
      icon: Calculator
    },
    batch: {
      title: 'Batch Project Example',
      description: 'Multi-chapter academic document with figures and comprehensive structure',
      content: batchExample,
      icon: FileText
    }
  };

  const currentExample = examples[activeExample];
  const Icon = currentExample.icon;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Eye className="h-5 w-5" />
          <span>Formatting Preview</span>
          <Badge variant="outline" className="ml-auto">World-Class Structure</Badge>
        </CardTitle>
        <CardDescription>
          See how your content will be beautifully formatted with proper markdown, math equations, tables, and more
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeExample} onValueChange={(value) => setActiveExample(value as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="scholarly" className="flex items-center space-x-2">
              <BookOpen className="h-4 w-4" />
              <span>Scholarly</span>
            </TabsTrigger>
            <TabsTrigger value="technical" className="flex items-center space-x-2">
              <Calculator className="h-4 w-4" />
              <span>Technical</span>
            </TabsTrigger>
            <TabsTrigger value="batch" className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>Batch Project</span>
            </TabsTrigger>
          </TabsList>

          {(['scholarly', 'technical', 'batch'] as const).map((type) => (
            <TabsContent key={type} value={type} className="mt-0">
              <div className="space-y-4">
                <div className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg">
                  <Icon className="h-5 w-5 text-primary" />
                  <div>
                    <div className="font-medium text-sm">{examples[type].title}</div>
                    <div className="text-xs text-muted-foreground">{examples[type].description}</div>
                  </div>
                </div>
                
                <div className="border rounded-lg bg-background max-h-96 overflow-y-auto">
                  <div className="p-4">
                    <MarkdownRenderer 
                      content={examples[type].content} 
                      className="max-w-none text-sm" 
                    />
                  </div>
                </div>

                <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg">
                  <div className="font-medium mb-1">Features demonstrated:</div>
                  <div className="space-y-1">
                    {type === 'scholarly' && (
                      <>
                        <div>• Proper heading hierarchy (# ## ###)</div>
                        <div>• Citations and references</div>
                        <div>• Tables and blockquotes</div>
                        <div>• Figure placeholders</div>
                      </>
                    )}
                    {type === 'technical' && (
                      <>
                        <div>• LaTeX mathematical equations</div>
                        <div>• Step-by-step numbered solutions</div>
                        <div>• Data tables and results</div>
                        <div>• Bold highlights for key answers</div>
                      </>
                    )}
                    {type === 'batch' && (
                      <>
                        <div>• Multi-chapter structure</div>
                        <div>• Comprehensive academic formatting</div>
                        <div>• Figure numbering and placement</div>
                        <div>• Professional document layout</div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
};