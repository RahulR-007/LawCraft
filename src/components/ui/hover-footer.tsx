"use client";
import { useRef, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Mail,
  Phone,
  MapPin,
  Scale,
} from "lucide-react";
import {
  FiFacebook,
  FiInstagram,
  FiTwitter,
  FiDribbble,
  FiGlobe,
} from "react-icons/fi";
import { cn } from "@/lib/utils";

export const TextHoverEffect = ({
  text,
  duration,
  className,
}: {
  text: string;
  duration?: number;
  automatic?: boolean;
  className?: string;
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [cursor, setCursor] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);
  const [maskPosition, setMaskPosition] = useState({ cx: "50%", cy: "50%" });

  useEffect(() => {
    if (svgRef.current && cursor.x !== null && cursor.y !== null) {
      const svgRect = svgRef.current.getBoundingClientRect();
      const cxPercentage = ((cursor.x - svgRect.left) / svgRect.width) * 100;
      const cyPercentage = ((cursor.y - svgRect.top) / svgRect.height) * 100;
      setMaskPosition({
        cx: `${cxPercentage}%`,
        cy: `${cyPercentage}%`,
      });
    }
  }, [cursor]);

  return (
    <svg
      ref={svgRef}
      width="100%"
      height="100%"
      viewBox="0 0 300 100"
      xmlns="http://www.w3.org/2000/svg"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseMove={(e) => setCursor({ x: e.clientX, y: e.clientY })}
      className={cn("select-none uppercase cursor-pointer", className)}
      style={{ userSelect: 'none', cursor: 'pointer' }}
    >
      <defs>
        <linearGradient
          id="textGradient"
          gradientUnits="userSpaceOnUse"
          cx="50%"
          cy="50%"
          r="25%"
        >
          {hovered && (
            <>
              <stop offset="0%" stopColor="#eab308" />
              <stop offset="25%" stopColor="#ef4444" />
              <stop offset="50%" stopColor="#80eeb4" />
              <stop offset="75%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </>
          )}
        </linearGradient>

        <motion.radialGradient
          id="revealMask"
          gradientUnits="userSpaceOnUse"
          r="20%"
          initial={{ cx: "50%", cy: "50%" }}
          animate={maskPosition}
          transition={{ duration: duration ?? 0, ease: "easeOut" }}
        >
          <stop offset="0%" stopColor="white" />
          <stop offset="100%" stopColor="black" />
        </motion.radialGradient>
        <mask id="textMask">
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="url(#revealMask)"
          />
        </mask>
      </defs>
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="middle"
        strokeWidth="0.3"
        className="fill-transparent stroke-neutral-200 font-[helvetica] text-7xl font-bold dark:stroke-neutral-800"
        style={{ opacity: hovered ? 0.7 : 0 }}
      >
        {text}
      </text>
      <motion.text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="middle"
        strokeWidth="0.3"
        className="fill-transparent stroke-[#970fff] font-[helvetica] text-7xl font-bold 
        dark:stroke-[#970fff99]"
        initial={{ strokeDashoffset: 1000, strokeDasharray: 1000 }}
        animate={{
          strokeDashoffset: 0,
          strokeDasharray: 1000,
        }}
        transition={{
          duration: 4,
          ease: "easeInOut",
        }}
      >
        {text}
      </motion.text>
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="middle"
        stroke="url(#textGradient)"
        strokeWidth="0.3"
        mask="url(#textMask)"
        className="fill-transparent font-[helvetica] text-7xl font-bold"
      >
        {text}
      </text>
    </svg>
  );
};

export const FooterBackgroundGradient = () => {
  return (
    <div
      className="absolute inset-0 z-0"
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        background:
          "radial-gradient(125% 125% at 50% 10%, #0F0F1166 50%, #970fff33 100%)",
      }}
    />
  );
};

export const HoverFooter = () => {
  const navigate = useNavigate();
  const footerLinks = [
    {
      title: "Legal Solutions",
      links: [
        { label: "Contract Generator", href: "/generate" },
        { label: "NDA Builder", href: "/generate" },
        { label: "Employment Agreements", href: "/generate" },
        { label: "Loan Notes", href: "/generate" },
      ],
    },
    {
      title: "Platform",
      links: [
        { label: "Law Updates Feed", href: "/law-updates" },
        { label: "Compliance Engine", href: "/dashboard" },
        {
          label: "Live AI Assistant",
          href: "#",
          pulse: true,
        },
      ],
    },
  ];

  const contactInfo = [
    {
      icon: <Mail size={18} style={{ color: "#970fff" }} />,
      text: "support@lawcraft.ai",
      href: "mailto:support@lawcraft.ai",
    },
    {
      icon: <Phone size={18} style={{ color: "#970fff" }} />,
      text: "+1 (800) LAW-CRAFT",
      href: "tel:+18005292723",
    },
    {
      icon: <MapPin size={18} style={{ color: "#970fff" }} />,
      text: "LawCraft Legal Platform",
    },
  ];

  const socialLinks = [
    { icon: <FiFacebook size={20} />, label: "Facebook", href: "#" },
    { icon: <FiInstagram size={20} />, label: "Instagram", href: "#" },
    { icon: <FiTwitter size={20} />, label: "Twitter", href: "#" },
    { icon: <FiDribbble size={20} />, label: "Dribbble", href: "#" },
    { icon: <FiGlobe size={20} />, label: "Globe", href: "#" },
  ];

  return (
    <footer
      className="bg-[#0F0F11]/90 text-gray-300 relative h-fit rounded-3xl overflow-hidden my-12 border border-purple-500/20 shadow-2xl"
      style={{
        backgroundColor: "rgba(15, 15, 17, 0.95)",
        color: "#d1d5db",
        position: "relative",
        borderRadius: "1.5rem",
        overflow: "hidden",
        margin: "3rem 0",
        border: "1px solid rgba(151, 15, 255, 0.25)",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.8)",
      }}
    >
      <div
        className="max-w-7xl mx-auto z-40 relative"
        style={{
          maxWidth: "80rem",
          margin: "0 auto",
          padding: "clamp(1.25rem, 4vw, 3.5rem)",
          position: "relative",
          zIndex: 40,
        }}
      >
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 md:gap-8 lg:gap-16 pb-12"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "2.5rem",
            paddingBottom: "3rem",
          }}
        >
          {/* Brand section */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <Scale size={28} style={{ color: "#970fff" }} />
              <span style={{ color: "#ffffff", fontSize: "1.875rem", fontWeight: 800, letterSpacing: "-0.025em" }}>
                Law<span style={{ color: "#970fff" }}>Craft</span>
              </span>
            </div>
            <p style={{ fontSize: "0.875rem", lineHeight: 1.625, color: "#9ca3af", margin: 0 }}>
              Enterprise-grade AI legal document generation platform with real-time compliance scoring and verified statutory grounding.
            </p>
          </div>

          {/* Footer link sections */}
          {footerLinks.map((section) => (
            <div key={section.title}>
              <h4 style={{ color: "#ffffff", fontSize: "1.125rem", fontWeight: 600, marginBottom: "1.25rem", marginTop: 0 }}>
                {section.title}
              </h4>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {section.links.map((link) => (
                  <li key={link.label} style={{ listStyle: "none", position: "relative" }}>
                    <a
                      href={link.href}
                      onClick={(e) => {
                        e.preventDefault();
                        if (link.label === "Live AI Assistant") {
                          window.dispatchEvent(new CustomEvent('open-chatbot'));
                        } else if (link.href && link.href.startsWith('/')) {
                          navigate(link.href);
                        }
                      }}
                      style={{ color: "#9ca3af", textDecoration: "none", transition: "color 0.2s ease", cursor: "pointer" }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "#970fff")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "#9ca3af")}
                    >
                      {link.label}
                    </a>
                    {link.pulse && (
                      <span
                        style={{
                          position: "absolute",
                          top: "6px",
                          marginLeft: "8px",
                          width: "8px",
                          height: "8px",
                          borderRadius: "50%",
                          backgroundColor: "#970fff",
                          boxShadow: "0 0 8px #970fff",
                        }}
                      />
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Contact section */}
          <div>
            <h4 style={{ color: "#ffffff", fontSize: "1.125rem", fontWeight: 600, marginBottom: "1.25rem", marginTop: 0 }}>
              Contact Us
            </h4>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "1rem" }}>
              {contactInfo.map((item, i) => (
                <li key={i} style={{ listStyle: "none", display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  {item.icon}
                  {item.href ? (
                    <a
                      href={item.href}
                      style={{ color: "#9ca3af", textDecoration: "none", transition: "color 0.2s ease" }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "#970fff")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "#9ca3af")}
                    >
                      {item.text}
                    </a>
                  ) : (
                    <span style={{ color: "#9ca3af" }}>
                      {item.text}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <hr style={{ borderColor: "rgba(255, 255, 255, 0.1)", margin: "2rem 0" }} />

        {/* Footer bottom */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem", fontSize: "0.875rem" }}>
          {/* Social icons */}
          <div style={{ display: "flex", gap: "1.5rem", color: "#9ca3af" }}>
            {socialLinks.map(({ icon, label, href }) => (
              <a
                key={label}
                href={href}
                aria-label={label}
                style={{ color: "#9ca3af", transition: "color 0.2s ease" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#970fff")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#9ca3af")}
              >
                {icon}
              </a>
            ))}
          </div>

          {/* Copyright */}
          <p style={{ color: "#9ca3af", margin: 0 }}>
            &copy; {new Date().getFullYear()} LawCraft AI. All rights reserved.
          </p>
        </div>
      </div>

      {/* Text hover effect */}
      <div style={{ display: "flex", justifyContent: "center", height: "clamp(8rem, 15vw, 16rem)", marginTop: "clamp(-3rem, -4vw, -6rem)", marginBottom: "-2rem", position: "relative", zIndex: 50, overflow: "hidden" }}>
        <TextHoverEffect text="LawCraft" className="z-50" />
      </div>

      <FooterBackgroundGradient />
    </footer>
  );
};

export default HoverFooter;
