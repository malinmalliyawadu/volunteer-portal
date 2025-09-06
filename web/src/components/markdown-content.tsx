import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";

interface PolicyContentProps {
  content: string;
  className?: string;
  onAgree?: () => void;
  showAgreeButton?: boolean;
}

export function PolicyContent({ 
  content, 
  className = "", 
  onAgree,
  showAgreeButton = false
}: PolicyContentProps) {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Reset scroll state when component mounts or when dialog opens
  useEffect(() => {
    if (showAgreeButton) {
      setHasScrolledToBottom(false);
      // Reset scroll position to top
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
      }
    }
  }, [showAgreeButton]);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer || !showAgreeButton) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10; // 10px threshold
      setHasScrolledToBottom(isAtBottom);
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    // Check initial state
    handleScroll();

    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [showAgreeButton]);

  // Simple function to convert basic markdown to JSX
  const formatContent = (text: string) => {
    const lines = text.split("\n");
    const elements: React.JSX.Element[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (!line) {
        elements.push(<br key={i} />);
        continue;
      }

      if (line.startsWith("# ")) {
        elements.push(
          <h1 key={i} className="text-xl font-bold mb-4 text-foreground">
            {line.substring(2)}
          </h1>
        );
      } else if (line.startsWith("## ")) {
        elements.push(
          <h2
            key={i}
            className="text-lg font-semibold mb-3 mt-6 text-foreground"
          >
            {line.substring(3)}
          </h2>
        );
      } else if (line.startsWith("### ")) {
        elements.push(
          <h3
            key={i}
            className="text-base font-medium mb-2 mt-4 text-foreground"
          >
            {line.substring(4)}
          </h3>
        );
      } else if (line.startsWith("- ")) {
        elements.push(
          <div key={i} className="ml-4 mb-1">
            <span className="text-sm text-muted-foreground">
              • {line.substring(2)}
            </span>
          </div>
        );
      } else if (line.startsWith("---")) {
        elements.push(<hr key={i} className="my-6 border-border" />);
      } else if (line.startsWith("*") && line.endsWith("*")) {
        elements.push(
          <p
            key={i}
            className="mb-3 text-sm text-muted-foreground italic leading-relaxed"
          >
            {line.substring(1, line.length - 1)}
          </p>
        );
      } else {
        // Process bold text
        const boldText = line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
        elements.push(
          <p
            key={i}
            className="mb-3 text-sm text-muted-foreground leading-relaxed"
            dangerouslySetInnerHTML={{ __html: boldText }}
          />
        );
      }
    }

    return elements;
  };

  return (
    <div className={`max-w-none ${className}`}>
      <div 
        ref={scrollContainerRef}
        className={showAgreeButton ? "max-h-96 overflow-y-auto pr-2" : ""}
      >
        {formatContent(content)}
      </div>
      {showAgreeButton && (
        <div className="mt-4 pt-4 border-t border-border">
          <Button
            onClick={onAgree}
            disabled={!hasScrolledToBottom}
            className="w-full"
            variant="default"
          >
            {hasScrolledToBottom ? "I agree to these terms" : "Please scroll to the bottom to continue"}
          </Button>
          {!hasScrolledToBottom && (
            <p className="text-xs text-muted-foreground mt-2 text-center">
              You must scroll to the bottom to read the complete policy before agreeing
            </p>
          )}
        </div>
      )}
    </div>
  );
}
