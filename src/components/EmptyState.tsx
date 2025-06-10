import React from "react";

interface EmptyStateProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  variant?: "default" | "chart" | "card";
}

const EmptyState = ({
  icon: Icon,
  title,
  description,
  variant,
}: EmptyStateProps) => {
  if (variant === "chart") {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Icon className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="text-gray-900 font-medium mb-2 text-sm">{title}</h3>
        {description && (
          <p className="text-gray-500 text-sm max-w-sm mx-auto">
            {description}
          </p>
        )}
      </div>
    );
  }

  if (variant === "card") {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Icon className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="text-gray-900 font-medium mb-2 text-sm">{title}</h3>
        {description && (
          <p className="text-gray-500 text-sm max-w-sm mx-auto">
            {description}
          </p>
        )}
      </div>
    );
  }

  // default variant
  return (
    <div className="text-center py-16">
      <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <Icon className="h-10 w-10 text-gray-400" />
      </div>
      <h3 className="text-gray-900 font-medium mb-2 text-base">{title}</h3>
      {description && (
        <p className="text-gray-500 text-sm max-w-sm mx-auto mb-6">
          {description}
        </p>
      )}
    </div>
  );
};

export default EmptyState;
