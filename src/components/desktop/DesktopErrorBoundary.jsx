import React from 'react';

export default class DesktopErrorBoundary extends React.Component {
  constructor(props){
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error){ return { hasError: true, error }; }
  componentDidCatch(error, info){ if (window?.SREE_DEBUG) console.error('[DesktopErrorBoundary]', error, info); }
  render(){
    if (this.state.hasError) {
      return (
        <div className="p-3 text-sm bg-yellow-50 border border-yellow-200 rounded-md text-yellow-800">
          Desktop features unavailable — running in web mode
        </div>
      );
    }
    return this.props.children;
  }
}